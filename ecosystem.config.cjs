module.exports = {
  apps: [
    {
      name: "qurious-transcription-tester",
      script: "./node_modules/.bin/serve",
      args: "-s dist -l 9973",
      cwd: "/home/lexcode/workspace/Michael/transcription-client-side-prototype",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};

// module.exports = {
//   apps: [
//     {
//       name: "qurious-transcription-tester",
//       script: "npx",
//       args: "vite --host 0.0.0.0 --port 9973",
//       cwd: "/home/lexcode/workspace/Michael/transcription-client-side-prototype",
//       env: {
//         NODE_ENV: "development",
//       },
//     },
//   ],
// };