// Type definitions for realsense.js 3.0
// Project: https://software.intel.com/realsense SDK
// Definitions by: Martin W. Kirst <https://github.com/nitram509>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

declare var pxcmConst:realsense.pxcmConst;

declare var RealSenseInfo:RealSenseInfo;
declare var PXCMSenseManager_CreateInstance:PXCMSenseManager_CreateInstance;

interface RealSenseInfo {
  (features:Array<string>, callback:(info:RealSenseInfoEvent) => void) : void;
}

interface RealSenseInfoEvent {
  IsReady : boolean;
}

interface PXCMSenseManager_CreateInstance {
  ():PXCMSenseManager_CreateInstance;

  // TODO: this should be reworked as promises

  then(callback:(result:PXCSenseManager) => void) : PXCMSenseManager_CreateInstance;
  then(callback:(result:PXCMHandModule) => void) : PXCMSenseManager_CreateInstance;
  then(callback:(result:PXCMHandConfiguration) => void) : PXCMSenseManager_CreateInstance;
  then(callback:(result:PXCMCaptureManager) => void) : PXCMSenseManager_CreateInstance;
  then(callback:(result:PXCMImageSize) => void) : PXCMSenseManager_CreateInstance;
  catch(callback:(error:any) => void) : PXCMSenseManager_CreateInstance;
}

interface PXCSenseManager {
  EnableHand(onHandData:(mid:any, module:PXCMHandModule, data:HandTrackingData)=>void):any;
  PauseHand(pause:boolean):any;
  Init(onConnect:any, onStatus:any):any;
  StreamFrames():any;
  QueryCaptureManager():any;
}

interface HandTrackingData {
  hands:IHand[];
  alerts:AlertData[];
  gestures:GestureData[];
}

interface IHand {
  uniqueId:any;
  userId:string;
  timeStamp:any;
  isCalibrated:boolean;
  bodySide:BodySideType;
  boundingBoxImage:PXCMRectI32;
  massCenterImage:PXCMPointF32;
  massCenterWorld:PXCMPoint3DF32;
  palmOrientation:PXCMPoint4DF32;
  extremityPoints:ExtremityData[]
  fingerData:FingerData[];
  trackedJoint:JointData[];
  normalizedJoint:JointData[];

  openness:number;
}

declare enum BodySideType {
  BODY_SIDE_UNKNOWN = 0,
  BODY_SIDE_LEFT = 1,
  BODY_SIDE_RIGHT = 2
}

declare enum EXTREMITY_INDEX {
  /**
   @brief Indexes of an extremity of the tracked hand
   */
  EXTREMITY_CLOSEST = 0,
  EXTREMITY_LEFTMOST = 1,
  EXTREMITY_RIGHTMOST = 2,
  EXTREMITY_TOPMOST = 3,
  EXTREMITY_BOTTOMMOST = 4,
  EXTREMITY_CENTER = 5
}
interface ExtremityData {
  pointWorld:PXCMPoint3DF32;
  pointImage:PXCMPoint3DF32;
}

interface FingerData {
  foldedness:number;
  radius:number;
}

interface JointData {
  confidence:number;
  positionWorld:PXCMPoint3DF32;
  positionImage:PXCMPoint3DF32;
  localRotation:PXCMPoint4DF32;
  globalRotation:PXCMPoint4DF32;
  speed:any;
}

interface AlertData {
  label:any;
  handId:any;
  timeStamp:any;
  frameNumber:number;
}

interface GestureData {
  timeStamp:any;
  handId:any;
  state:GestureState;
  frameNumber:number;
  name:any;
}

declare enum GestureState {
  GESTURE_STATE_START = 0,
  GESTURE_STATE_IN_PROGRESS = 1,
  GESTURE_STATE_END = 2
}

interface PXCMPoint3DF32 {
  x:number;
  y:number;
  z:number;
}

interface PXCMPoint4DF32 {
  x:number;
  y:number;
  z:number;
  w:number;
}

interface PXCMPointF32 {
  x:number;
  y:number;
}

interface PXCMRectI32 {
  x:number;
  y:number;
  w:number;
  h:number;
}

interface PXCMHandModule {
  CreateActiveConfiguration():PXCMHandConfiguration;
}

interface PXCMHandConfiguration {
  ApplyChanges():void;
  EnableAllGestures(enabled:boolean):void;
  DisableAllGestures():void;
  EnableAllAlerts():void;
  DisableAllAlerts():void;

  EnableGesture(gestureName:string, continuousGesture:boolean):void;  // HACK !!! patched realsense-3.0 by me ;-)
}

interface PXCMCaptureManager {
  QueryImageSize(stream:realsense.StreamType)
}

interface PXCMImageSize {
  sts:PXCMStatus;
  size:PXCMSizeI32
}

interface PXCMSizeI32 {
  width:number;
  height:number;
}

declare enum PXCMStatus {

}

declare module realsense {

  interface pxcmConst {
    PXCMCapture:PXCMCapture;
  }

  interface PXCMCapture {
    /**
     @enum StreamType
     Bit-OR'ed values of stream types, physical or virtual streams.
     */
    STREAM_TYPE_ANY: StreamType;          /* Unknown/undefined type */
    STREAM_TYPE_COLOR: StreamType;     /* the color stream type  */
    STREAM_TYPE_DEPTH: StreamType;     /* the depth stream type  */
    STREAM_TYPE_IR: StreamType;     /* the infrared stream type */
    STREAM_TYPE_LEFT: StreamType;     /* the stereoscopic left intensity image */
    STREAM_TYPE_RIGHT: StreamType;     /* the stereoscopic right intensity image */
  }

  enum StreamType {
    STREAM_TYPE_ANY,
    STREAM_TYPE_COLOR,
    STREAM_TYPE_DEPTH,
    STREAM_TYPE_IR,
    STREAM_TYPE_LEFT,
    STREAM_TYPE_RIGHT
  }

}
