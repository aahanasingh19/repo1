import { Queue, Worker } from "bullmq";
import redis from "../config/redis.config";
import Docker from "dockerode";

export const cleanupQueue = new Queue("CleanupQueue", {
  connection: redis,
});

export const initCleanupWorker = async () => {
  new Worker(
    "CleanupQueue",
    async () => {
      console.log("Running automated Docker resource cleanup...");
      try {
        const docker = new Docker();
        
        // Prune stopped containers
        const containersResult = await docker.pruneContainers();
        const deletedContainers = containersResult.ContainersDeleted?.length || 0;
        const reclaimedSpaceContainers = containersResult.SpaceReclaimed || 0;

        // Prune dangling/unused images older than 1h
        const imagesResult = await docker.pruneImages({
          filters: {
            dangling: ["false"], // The user instruction says 'docker image prune -a', so dangling=false essentially means all unused images
            until: ["1h"]
          }
        });
        const deletedImages = imagesResult.ImagesDeleted?.length || 0;
        const reclaimedSpaceImages = imagesResult.SpaceReclaimed || 0;
        
        console.log(`Cleanup success. Cleaned ${deletedContainers} containers, ${deletedImages} images.`);
        console.log(`Containers reclaimed: ${reclaimedSpaceContainers} bytes`);
        console.log(`Images reclaimed: ${reclaimedSpaceImages} bytes`);

      } catch (error) {
        console.error("Docker cleanup error:", error instanceof Error ? error.message : String(error));
      }
    },
    { connection: redis }
  );

  await cleanupQueue.add(
    "dockerCleanupJob",
    {},
    {
      repeat: {
        pattern: "*/5 * * * *", // Every 5 minutes
      },
    }
  );

  console.log("Cleanup worker initialized (runs every 5 minutes).");
};
