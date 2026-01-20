import { YoutubeTranscript } from "youtube-transcript";

const videoId = "j8wdu5VTozs";

console.log(`Fetching transcript for ${videoId}...`);

YoutubeTranscript.fetchTranscript(videoId)
  .then((transcript) => {
    console.log("Success!");
    console.log("Type:", typeof transcript);
    console.log("Is Array:", Array.isArray(transcript));
    console.log("Length:", transcript ? transcript.length : "N/A");
    console.log("First item:", transcript ? transcript[0] : "N/A");
  })
  .catch((err) => {
    console.error("Failed:");
    console.error(err);
  });
