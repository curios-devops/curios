// trtc-sdk-v5's .d.ts uses WebCodecs track types that TypeScript's DOM lib doesn't ship
// (we keep skipLibCheck off, so lib .d.ts files are checked).
interface MediaStreamAudioTrack extends MediaStreamTrack {}
interface MediaStreamVideoTrack extends MediaStreamTrack {}
