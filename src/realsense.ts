/// <reference path="./realsense.d.ts" />

class RealSensePlugin {

  private sense:any;
  private imageSize:PXCMSizeI32;
  private handModule:PXCMHandModule;
  private handConfiguration:PXCMHandConfiguration;

  public checkPlatformCompatibility() {
    RealSenseInfo(['hand'], function (info) {
      if (info.IsReady == true) {
        //$('#info').append('<b>Platform supports Intel(R) RealSense(TM) SDK feature</b>');
        //status('OK');
        //document.getElementById("Start").disabled = false;
      } else {
        //status('Platform not supported: ' + info.responseText);
        //if (info.IsPlatformSupported != true) {
        //  $('#info').append('<b>Intel&reg; RealSense&trade; 3D camera not found</b>');
        //} else if (info.IsBrowserSupported != true) {
        //  $('#info').append('<b>Please update your browser to latest version</b>');
        //} else {
        //  $('#info').append('<b>Please download and install the following update(s) before running sample: </b>');
        //  for (i = 0; i < info.Updates.length; i++) {
        //    $('#info').append('<a href="' + info.Updates[i].url + '">' + info.Updates[i].href + '</a><br>');
        //  }
        //}
      }
    });
  }

  private onHandData(mid:any, module:PXCMHandModule, data:HandTrackingData):void {
    var canvas = document.getElementById('myCanvas');
    var context = canvas['getContext']('2d');
    var radius = 5;
    var scale = 1;

    canvas['width'] = this.imageSize.width;
    canvas['height'] = this.imageSize.height;

    if (typeof data.hands === 'undefined') return;
    for (var h = 0; h < data.hands.length; h++) {
      var joints = data.hands[h].trackedJoint;
      if (joints.length > 0) {
        var baseX = joints[0].positionImage.x;
        var baseY = joints[0].positionImage.y;
        var wristX = joints[0].positionImage.x;
        var wristY = joints[0].positionImage.y;

        for (var j = 0; j < joints.length; j++) {
          if (joints[j] == null || joints[j].confidence <= 0) continue;

          var x = joints[j].positionImage.x;
          var y = joints[j].positionImage.y;

          context.beginPath();
          context.arc(x * scale, y * scale, radius, 0, 2 * Math.PI);
          context.lineWidth = 2;
          context.strokeStyle = 'green';
          context.stroke();

          if (j == 2 || j == 6 || j == 10 || j == 14 || j == 18) {
            baseX = wristX;
            baseY = wristY;
          }

          context.beginPath();
          context.moveTo(baseX * scale, baseY * scale);
          context.lineTo(x * scale, y * scale);
          context.stroke();

          baseX = x;
          baseY = y;
        }
      }
    }
    for (var a = 0; a < data.alerts.length; a++) {
      //$('#alerts_status').text('Alert: ' + JSON.stringify(data.alerts[a]));
    }

    for (var g = 0; g < data.gestures.length; g++) {
      var gesture:GestureData = data.gestures[g];
      if (gesture.name == 'swipe' && gesture.state == GestureState.GESTURE_STATE_START) {
        // TODO: does this state need to be tracked ?
      }
      if (gesture.name == 'swipe' && gesture.state == GestureState.GESTURE_STATE_END) {
        // TODO: what if no hands ???  what if more hands ???
        if (data.hands[0].bodySide == BodySideType.BODY_SIDE_RIGHT) {
          this.onSwipeRight2Left();
        }
        if (data.hands[0].bodySide == BodySideType.BODY_SIDE_LEFT) {
          this.onSwipeLeft2Right();
        }
      }
    }
  }

  private onSwipeRight2Left() {
    console.log("SWIPE right -> left");
  }

  private onSwipeLeft2Right() {
    console.log("SWIPE left -> right");
  }

  public start():void {
    document.getElementById("Start").disabled = true;
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
      if (document.getElementById("alerts")['checked'])
        return this.handConfiguration.EnableAllAlerts();
      else
        return this.handConfiguration.DisableAllAlerts();
    }).then((result:any) => {
      if (document.getElementById("gestures")['checked'])
        return this.handConfiguration.EnableAllGestures(false);
      else
        return this.handConfiguration.DisableAllGestures();
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
      document.getElementById("Stop").disabled = false;
    }).catch((error) => {
      this.status('Init failed: ' + JSON.stringify(error));
      document.getElementById("Start").disabled = false;
    });
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
    var canvas = document.getElementById('myCanvas');
    var context = canvas['getContext']('2d');
    context.clearRect(0, 0, canvas['width'], canvas['height']);
  }

}