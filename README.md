# WebRTCSources Component Overview

The WebRTCSources React component provides a user interface to select video and audio sources using WebRTC and displays the video feed with motion detection and image capture functionality. Below is a concise explanation of its key features:

## Features:
1. **Device Selection**:
   - Fetches available video (`videoinput`) and audio (`audioinput`) devices using `navigator.mediaDevices.enumerateDevices`.
   - Allows users to select the desired video and audio sources from dropdown menus.
   
2. **Video Streaming**:
   - Starts a video stream from the selected video source.
   - Outputs the video stream in a `<video>` element.

3. **Motion Detection**:
   - Compares consecutive video frames to detect motion.
   - Displays a “Motion detected!” or “No motion detected!” message based on the results.

4. **Image Capture**:
   - Captures a still image when no motion is detected for more than 1 second.
   - Stores captured images as base64 strings and displays them in a scrollable list.

5. **Sound Feedback**:
   - Plays a capture sound when an image is captured.

6. **Unique Image Detection**:
   - Ensures captured images are unique by comparing pixel data with the last captured image.


## DEMO
Link Demo:[https://tech.duckfollow.co/view/capturevideo-demo](https://tech.duckfollow.co/view/capturevideo-demo)

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.