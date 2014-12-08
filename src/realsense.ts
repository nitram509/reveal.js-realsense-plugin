/// <reference path="./realsense.d.ts" />

class RealSensePlugin {

  private sense:any;
  private imageSize:PXCMSizeI32;
  private handModule:PXCMHandModule;
  private handConfiguration:PXCMHandConfiguration;

  private alerts : boolean = false;
  private gestures : boolean = true;

  public checkPlatformCompatibility() {
    RealSenseInfo(['hand'], function (info) {
      if (info.IsReady == true) {
        // TODO
      } else {
        // TODO tell the user what's wrong and how to fix
      }
    });
  }

  public start():void {
    //document.getElementById("Start").disabled = true;
    PXCMSenseManager_CreateInstance().then((result) => {
      this.sense = result;
      return this.sense.EnableHand(this.onHandData.bind(this));
    }).then((result:PXCMHandModule) => {
      this.handModule = result;
      this.status('Init started');
      return this.sense.Init(this.onConnect, this.onStatus);
    }).then((result:any) => {
      return this.handModule.CreateActiveConfiguration();
    }).then((result:PXCMHandConfiguration) => {
      this.handConfiguration = result;
      if (this.alerts)
        return this.handConfiguration.EnableAllAlerts();
      else
        return this.handConfiguration.DisableAllAlerts();
    }).then((result:any) => {
      if (this.gestures)
        return this.handConfiguration.EnableGesture("tap", false);
      else
        return this.handConfiguration.DisableAllGestures();
    }).then((result:any) => {
      if (this.gestures)
        return this.handConfiguration.EnableGesture("swipe", false);
      else
        return this.handConfiguration.DisableAllGestures();
    }).then((result:any) => {
      if (this.gestures)
        return this.handConfiguration.EnableGesture("v_sign", false);
    //  else
    //    return this.handConfiguration.DisableAllGestures();
    //}).then((result:any) => {
    //  if (this.gestures)
    //    return this.handConfiguration.EnableGesture("thumb_down", false);
    //  else
    //    return this.handConfiguration.DisableAllGestures();
    }).then((result:any) => {
      return this.handConfiguration.ApplyChanges();
    }).then((result:any) => {
      return this.sense.QueryCaptureManager();
    }).then((capture:PXCMCaptureManager) => {
      return capture.QueryImageSize(pxcmConst.PXCMCapture.STREAM_TYPE_DEPTH);
    }).then((result:PXCMImageSize) => {
      this.imageSize = result.size;
      return this.sense.StreamFrames();
    }).then((result) => {
      this.status('Streaming ' + this.imageSize.width + 'x' + this.imageSize.height);
      //document.getElementById("Stop").disabled = false;
    }).catch((error) => {
      this.status('Init failed: ' + JSON.stringify(error));
      //document.getElementById("Start").disabled = false;
    });
  }

  private onHandData(mid:any, module:PXCMHandModule, data:HandTrackingData):void {
    if (data.gestures && data.gestures.length > 0) {
      for (var g = 0; g < data.gestures.length; g++) {
        var gesture:GestureData = data.gestures[g];
        if (gesture.name == 'tap' && gesture.state == GestureState.GESTURE_STATE_END) {
          this.onTap();
        } else if (gesture.name == 'v_sign' && gesture.state == GestureState.GESTURE_STATE_END) {
          this.onVSign();
        } else if (gesture.name == 'swipe' && gesture.state == GestureState.GESTURE_STATE_START) {
          // TODO: does this state need to be tracked ?
        } else if (gesture.name == 'swipe' && gesture.state == GestureState.GESTURE_STATE_END) {
          // TODO: what if no hands ???  what if more hands ???
          if (data.hands[0].bodySide == BodySideType.BODY_SIDE_RIGHT) {
            this.onSwipeRight2Left();
          }
          if (data.hands[0].bodySide == BodySideType.BODY_SIDE_LEFT) {
            this.onSwipeLeft2Right();
          }
        } else {
          console.log("Gesture.name:" + gesture.name);
        }
      }
    }
  }

  public stop() {
    document.getElementById("Stop").disabled = true;
    this.sense.Close().then((result)=> {
      this.status('Stopped');
      this.clear();
    });
  }

  private status(s:String):void {

  }

  private onConnect(data) {
    if (data.connected == false) {
      //$('#alerts_status').append('Alert: ' + JSON.stringify(data) + '<br>');
    }
  }

  private onStatus(data) {
    if (data.sts < 0) {
      this.status('Error ' + data.sts);
      this.clear();
    }
  }

  private clear() {
    //$('#alerts_status').text('');
    //$('#gestures_status').text('');
    document.getElementById("Start").disabled = false;
    //var canvas = document.getElementById('myCanvas');
    //var context = canvas['getContext']('2d');
    //context.clearRect(0, 0, canvas['width'], canvas['height']);
  }

  private onSwipeRight2Left() {
    if (window['Reveal']) {
      window['Reveal'].right();
    }
    console.log("SWIPE right -> left");
  }

  private onSwipeLeft2Right() {
    if (window['Reveal']) {
      window['Reveal'].left();
    }
    console.log("SWIPE left -> right");
  }

  private onTap() {
    if (window['Reveal']) {
      window['Reveal'].toggleOverview();
    }
    console.log("tap");
  }

  private onVSign() {
    if (window['Reveal']) {
      window['Reveal'].togglePause();
    }
    console.log("v_sign");
  }

}