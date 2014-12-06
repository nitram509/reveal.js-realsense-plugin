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

  private onHandData(mid:any, module:any, data:any):void {
    console.log("yeah")
  }

  public start():void {
    document.getElementById("Start").disabled = true;
    PXCMSenseManager_CreateInstance().then((result) => {
      this.sense = result;
      return this.sense.EnableHand(this.onHandData);
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
    //document.getElementById("Start").disabled = false;
    //var canvas = document.getElementById('myCanvas');
    //var context = canvas.getContext('2d');
    //context.clearRect(0, 0, canvas.width, canvas.height);
  }

}