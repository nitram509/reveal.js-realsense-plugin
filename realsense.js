/*! Native Promise Only
    v0.7.6-a (c) Kyle Simpson
    MIT License: http://getify.mit-license.org
*/

(function UMD(name,context,definition){
	// special form of UMD for polyfilling across evironments
	context[name] = context[name] || definition();
	if (typeof module != "undefined" && module.exports) { module.exports = context[name]; }
	else if (typeof define == "function" && define.amd) { define(function $AMD$(){ return context[name]; }); }
})("Promise",typeof global != "undefined" ? global : this,function DEF(){
	/*jshint validthis:true */
	"use strict";

	var builtInProp, cycle, scheduling_queue,
		ToString = Object.prototype.toString,
		timer = (typeof setImmediate != "undefined") ?
			function timer(fn) { return setImmediate(fn); } :
			setTimeout
	;

	// damnit, IE8.
	try {
		Object.defineProperty({},"x",{});
		builtInProp = function builtInProp(obj,name,val,config) {
			return Object.defineProperty(obj,name,{
				value: val,
				writable: true,
				configurable: config !== false
			});
		};
	}
	catch (err) {
		builtInProp = function builtInProp(obj,name,val) {
			obj[name] = val;
			return obj;
		};
	}

	// Note: using a queue instead of array for efficiency
	scheduling_queue = (function Queue() {
		var first, last, item;

		function Item(fn,self) {
			this.fn = fn;
			this.self = self;
			this.next = void 0;
		}

		return {
			add: function add(fn,self) {
				item = new Item(fn,self);
				if (last) {
					last.next = item;
				}
				else {
					first = item;
				}
				last = item;
				item = void 0;
			},
			drain: function drain() {
				var f = first;
				first = last = cycle = void 0;

				while (f) {
					f.fn.call(f.self);
					f = f.next;
				}
			}
		};
	})();

	function schedule(fn,self) {
		scheduling_queue.add(fn,self);
		if (!cycle) {
			cycle = timer(scheduling_queue.drain);
		}
	}

	// promise duck typing
	function isThenable(o) {
		var _then, o_type = typeof o;

		if (o != null &&
			(
				o_type == "object" || o_type == "function"
			)
		) {
			_then = o.then;
		}
		return typeof _then == "function" ? _then : false;
	}

	function notify() {
		for (var i=0; i<this.chain.length; i++) {
			notifyIsolated(
				this,
				(this.state === 1) ? this.chain[i].success : this.chain[i].failure,
				this.chain[i]
			);
		}
		this.chain.length = 0;
	}

	// NOTE: This is a separate function to isolate
	// the `try..catch` so that other code can be
	// optimized better
	function notifyIsolated(self,cb,chain) {
		var ret, _then;
		try {
			if (cb === false) {
				chain.reject(self.msg);
			}
			else {
				if (cb === true) {
					ret = self.msg;
				}
				else {
					ret = cb.call(void 0,self.msg);
				}

				if (ret === chain.promise) {
					chain.reject(TypeError("Promise-chain cycle"));
				}
				else if (_then = isThenable(ret)) {
					_then.call(ret,chain.resolve,chain.reject);
				}
				else {
					chain.resolve(ret);
				}
			}
		}
		catch (err) {
			chain.reject(err);
		}
	}

	function resolve(msg) {
		var _then, def_wrapper, self = this;

		// already triggered?
		if (self.triggered) { return; }

		self.triggered = true;

		// unwrap
		if (self.def) {
			self = self.def;
		}

		try {
			if (_then = isThenable(msg)) {
				def_wrapper = new MakeDefWrapper(self);
				_then.call(msg,
					function $resolve$(){ resolve.apply(def_wrapper,arguments); },
					function $reject$(){ reject.apply(def_wrapper,arguments); }
				);
			}
			else {
				self.msg = msg;
				self.state = 1;
				if (self.chain.length > 0) {
					schedule(notify,self);
				}
			}
		}
		catch (err) {
			reject.call(def_wrapper || (new MakeDefWrapper(self)),err);
		}
	}

	function reject(msg) {
		var self = this;

		// already triggered?
		if (self.triggered) { return; }

		self.triggered = true;

		// unwrap
		if (self.def) {
			self = self.def;
		}

		self.msg = msg;
		self.state = 2;
		if (self.chain.length > 0) {
			schedule(notify,self);
		}
	}

	function iteratePromises(Constructor,arr,resolver,rejecter) {
		for (var idx=0; idx<arr.length; idx++) {
			(function IIFE(idx){
				Constructor.resolve(arr[idx])
				.then(
					function $resolver$(msg){
						resolver(idx,msg);
					},
					rejecter
				);
			})(idx);
		}
	}

	function MakeDefWrapper(self) {
		this.def = self;
		this.triggered = false;
	}

	function MakeDef(self) {
		this.promise = self;
		this.state = 0;
		this.triggered = false;
		this.chain = [];
		this.msg = void 0;
	}

	function Promise(executor) {
		if (typeof executor != "function") {
			throw TypeError("Not a function");
		}

		if (this.__NPO__ !== 0) {
			throw TypeError("Not a promise");
		}

		// instance shadowing the inherited "brand"
		// to signal an already "initialized" promise
		this.__NPO__ = 1;

		var def = new MakeDef(this);

		this["then"] = function then(success,failure) {
			var o = {
				success: typeof success == "function" ? success : true,
				failure: typeof failure == "function" ? failure : false
			};
			// Note: `then(..)` itself can be borrowed to be used against
			// a different promise constructor for making the chained promise,
			// by substituting a different `this` binding.
			o.promise = new this.constructor(function extractChain(resolve,reject) {
				if (typeof resolve != "function" || typeof reject != "function") {
					throw TypeError("Not a function");
				}

				o.resolve = resolve;
				o.reject = reject;
			});
			def.chain.push(o);

			if (def.state !== 0) {
				schedule(notify,def);
			}

			return o.promise;
		};
		this["catch"] = function $catch$(failure) {
			return this.then(void 0,failure);
		};

		try {
			executor.call(
				void 0,
				function publicResolve(msg){
					resolve.call(def,msg);
				},
				function publicReject(msg) {
					reject.call(def,msg);
				}
			);
		}
		catch (err) {
			reject.call(def,err);
		}
	}

	var PromisePrototype = builtInProp({},"constructor",Promise,
		/*configurable=*/false
	);

	builtInProp(
		Promise,"prototype",PromisePrototype,
		/*configurable=*/false
	);

	// built-in "brand" to signal an "uninitialized" promise
	builtInProp(PromisePrototype,"__NPO__",0,
		/*configurable=*/false
	);

	builtInProp(Promise,"resolve",function Promise$resolve(msg) {
		var Constructor = this;

		// spec mandated checks
		// note: best "isPromise" check that's practical for now
		if (msg && typeof msg == "object" && msg.__NPO__ === 1) {
			return msg;
		}

		return new Constructor(function executor(resolve,reject){
			if (typeof resolve != "function" || typeof reject != "function") {
				throw TypeError("Not a function");
			}

			resolve(msg);
		});
	});

	builtInProp(Promise,"reject",function Promise$reject(msg) {
		return new this(function executor(resolve,reject){
			if (typeof resolve != "function" || typeof reject != "function") {
				throw TypeError("Not a function");
			}

			reject(msg);
		});
	});

	builtInProp(Promise,"all",function Promise$all(arr) {
		var Constructor = this;

		// spec mandated checks
		if (ToString.call(arr) != "[object Array]") {
			return Constructor.reject(TypeError("Not an array"));
		}
		if (arr.length === 0) {
			return Constructor.resolve([]);
		}

		return new Constructor(function executor(resolve,reject){
			if (typeof resolve != "function" || typeof reject != "function") {
				throw TypeError("Not a function");
			}

			var len = arr.length, msgs = Array(len), count = 0;

			iteratePromises(Constructor,arr,function resolver(idx,msg) {
				msgs[idx] = msg;
				if (++count === len) {
					resolve(msgs);
				}
			},reject);
		});
	});

	builtInProp(Promise,"race",function Promise$race(arr) {
		var Constructor = this;

		// spec mandated checks
		if (ToString.call(arr) != "[object Array]") {
			return Constructor.reject(TypeError("Not an array"));
		}

		return new Constructor(function executor(resolve,reject){
			if (typeof resolve != "function" || typeof reject != "function") {
				throw TypeError("Not a function");
			}

			iteratePromises(Constructor,arr,function resolver(idx,msg){
				resolve(msg);
			},reject);
		});
	});

	return Promise;
});

// *************************************************************************** //
/*******************************************************************************

 INTEL CORPORATION PROPRIETARY INFORMATION
 This software is supplied under the terms of a license agreement or nondisclosure
 agreement with Intel Corporation and may not be copied or disclosed except in
 accordance with the terms of that agreement
 Copyright(c) 2014 Intel Corporation. All Rights Reserved.

 *******************************************************************************/

var RealSense = { connection: null };
var RealSenseVersion = '3.0.1';

var pxcmConst = {
    // Interface identifiers
    PXCMVideoModule:            { CUID: 1775611958 },
    PXCM3DScan:                 { CUID: 826884947 },
    PXCM3DSeg:                  { CUID: 826885971 },
    PXCMAddRef:                 { CUID: 1397965122 },
    PXCMAudio:                  { CUID: 962214344 },
    PXCMAudioSource:            { CUID: -666790621 },
    PXCMCaptureManager:         { CUID: -661576891 },
    PXCMEmotion:                { CUID: 1314147653 },
    PXCMFaceConfiguration:      { CUID: 1195787078 },
    PXCMHandConfiguration:      { CUID: 1195589960 },
    PXCMFaceModule:             { CUID: 1144209734 },
    PXCMHandModule:             { CUID: 1313751368 },
    PXCMImage:                  { CUID: 611585910 },
    PXCMMetadata:               { CUID: 1647936547 },
    PXCMPowerState:             { CUID: 1196250960 },
    PXCMProjection:             { CUID: 1229620535 },
    PXCMSenseManager:           { CUID: -661306591 },
    PXCMSpeechRecognition:      { CUID: -2146187993 },
    PXCMSpeechSynthesis:        { CUID: 1398032726 },
    PXCMSyncPoint:              { CUID: 1347635283 },
    PXCMTouchlessController:    { CUID: 1397443654 },
    PXCMTracker:                { CUID: 1380667988 },

    PXCMHandData: {
        CUID: 1413563462,
        NUMBER_OF_FINGERS: 5,
        NUMBER_OF_EXTREMITIES: 6,
        NUMBER_OF_JOINTS: 22,
        RESERVED_NUMBER_OF_JOINTS: 32,
        MAX_NAME_SIZE: 64,
        MAX_PATH_NAME: 256,

        /**
         @brief
         Indexes of joints that can be tracked by the hand module
         */
        JOINT_WRIST: 0,		    /// The center of the wrist
        JOINT_CENTER: 1,		    /// The center of the palm
        JOINT_THUMB_BASE: 2,	    /// Thumb finger joint 1 (base)
        JOINT_THUMB_JT1: 3,		/// Thumb finger joint 2
        JOINT_THUMB_JT2: 4,		/// Thumb finger joint 3
        JOINT_THUMB_TIP: 5,		/// Thumb finger joint 4 (fingertip)
        JOINT_INDEX_BASE: 6,		/// Index finger joint 1 (base)
        JOINT_INDEX_JT1: 7,		/// Index finger joint 2
        JOINT_INDEX_JT2: 8,		/// Index finger joint 3
        JOINT_INDEX_TIP: 9,		/// Index finger joint 4 (fingertip)
        JOINT_MIDDLE_BASE: 10,		/// Middle finger joint 1 (base)
        JOINT_MIDDLE_JT1: 11,		/// Middle finger joint 2
        JOINT_MIDDLE_JT2: 12,		/// Middle finger joint 3
        JOINT_MIDDLE_TIP: 13,		/// Middle finger joint 4 (fingertip)
        JOINT_RING_BASE: 14,		/// Ring finger joint 1 (base)
        JOINT_RING_JT1: 15,		/// Ring finger joint 2
        JOINT_RING_JT2: 16,		/// Ring finger joint 3
        JOINT_RING_TIP: 17,		/// Ring finger joint 4 (fingertip)
        JOINT_PINKY_BASE: 18,		/// Pinky finger joint 1 (base)
        JOINT_PINKY_JT1: 19,		/// Pinky finger joint 2
        JOINT_PINKY_JT2: 20,		/// Pinky finger joint 3
        JOINT_PINKY_TIP: 21,		/// Pinky finger joint 4 (fingertip)

        /**
         @brief Indexes of an extremity of the tracked hand
         */
        EXTREMITY_CLOSEST: 0,     /// The closest point to the camera in the tracked hand
        EXTREMITY_LEFTMOST: 1,	/// The left-most point of the tracked hand
        EXTREMITY_RIGHTMOST: 2,	/// The right-most point of the tracked hand
        EXTREMITY_TOPMOST: 3,		/// The top-most point of the tracked hand
        EXTREMITY_BOTTOMMOST: 4,	/// The bottom-most point of the tracked hand
        EXTREMITY_CENTER: 5,		/// The center point of the tracked hand

        /**
         @brief Indexes of the hand fingers
         */
        FINGER_THUMB: 0,          /// Thumb finger
        FINGER_INDEX: 1,          /// Index finger
        FINGER_MIDDLE: 2,         /// Middle finger
        FINGER_RING: 3,           /// Ring finger
        FINGER_PINKY: 4,          /// Pinky finger

        /** @brief Side of the body that a hand belongs to
         */
        BODY_SIDE_UNKNOWN: 0,     /// The hand-type was not determined
        BODY_SIDE_LEFT: 1,        /// Left side of the body
        BODY_SIDE_RIGHT: 2,       /// Right side of the body

        /** @brief Enumerates the events that can be detected and fired by the module
         */
        ALERT_HAND_DETECTED: 0x0001,   ///  A hand is identified and its mask is available
        ALERT_HAND_NOT_DETECTED: 0x0002,   ///  A previously detected hand is lost, either because it left the field of view or because it is occluded
        ALERT_HAND_TRACKED: 0x0004,   ///  Full tracking information is available for a hand
        ALERT_HAND_NOT_TRACKED: 0x0008,   ///  No tracking information is available for a hand (none of the joints are tracked)
        ALERT_HAND_CALIBRATED: 0x0010,   ///  Hand measurements are ready and accurate
        ALERT_HAND_NOT_CALIBRATED: 0x0020,   ///  Hand measurements are not yet finalized, and are not fully accurate
        ALERT_HAND_OUT_OF_BORDERS: 0x0040,   ///  Hand is outside of the tracking boundaries
        ALERT_HAND_INSIDE_BORDERS: 0x0080,   ///  Hand has moved back inside the tracking boundaries
        ALERT_HAND_OUT_OF_LEFT_BORDER: 0x0100,   ///  The tracked object is touching the left border of the field of view
        ALERT_HAND_OUT_OF_RIGHT_BORDER: 0x0200,   ///  The tracked object is touching the right border of the field of view
        ALERT_HAND_OUT_OF_TOP_BORDER: 0x0400,   ///  The tracked object is touching the upper border of the field of view
        ALERT_HAND_OUT_OF_BOTTOM_BORDER: 0x0800,   ///  The tracked object is touching the lower border of the field of view
        ALERT_HAND_TOO_FAR: 0x1000,   ///  The tracked object is too far
        ALERT_HAND_TOO_CLOSE: 0x2000,   ///  The tracked object is too close

        /**
         @brief Available gesture event states
         */
        GESTURE_STATE_START: 0,		/// Gesture started
        GESTURE_STATE_IN_PROGRESS: 1,	/// Gesture is in progress
        GESTURE_STATE_END: 2,			/// Gesture ended

        /**
         @brief The Tracking mode indicates which set of joints will be tracked.
         */
        TRACKING_MODE_FULL_HAND: 0,	    /// Track the full skeleton
        TRACKING_MODE_EXTREMITIES: 1,	///<Unsupported> Track the extremities of the hand

        /**
         @brief List of available modes for calculating the joint's speed
         */
        JOINT_SPEED_AVERAGE: 0,         /// Average speed across time
        JOINT_SPEED_ABSOLUTE: 1,	    /// Average of absolute speed across time

        /**
         @enum AccessOrderType
         List of the different orders in which the hands can be accessed
         */
        ACCESS_ORDER_BY_ID: 0,
        ACCESS_ORDER_BY_TIME: 1,        /// From oldest to newest hand in the scene
        ACCESS_ORDER_NEAR_TO_FAR: 2,	/// From near to far hand in scene
        ACCESS_ORDER_LEFT_HANDS: 3,		/// All left hands
        ACCESS_ORDER_RIGHT_HANDS: 4,	/// All right hands
        ACCESS_ORDER_FIXED: 5			/// The index of each hand is fixed as long as it is detected (and between 0 and 1)
    },

    PXCMFaceData: {
        CUID: 1413759304,

        LANDMARK_NOT_NAMED: 0,
        LANDMARK_EYE_RIGHT_CENTER: 1,
        LANDMARK_EYE_LEFT_CENTER: 2,
        LANDMARK_EYELID_RIGHT_TOP: 3,
        LANDMARK_EYELID_RIGHT_BOTTOM: 4,
        LANDMARK_EYELID_RIGHT_RIGHT: 5,
        LANDMARK_EYELID_RIGHT_LEFT: 6,
        LANDMARK_EYELID_LEFT_TOP: 7,
        LANDMARK_EYELID_LEFT_BOTTOM: 8,
        LANDMARK_EYELID_LEFT_RIGHT: 9,
        LANDMARK_EYELID_LEFT_LEFT: 10,
        LANDMARK_EYEBROW_RIGHT_CENTER: 11,
        LANDMARK_EYEBROW_RIGHT_RIGHT: 12,
        LANDMARK_EYEBROW_RIGHT_LEFT: 13,
        LANDMARK_EYEBROW_LEFT_CENTER: 14,
        LANDMARK_EYEBROW_LEFT_RIGHT: 15,
        LANDMARK_EYEBROW_LEFT_LEFT: 16,
        LANDMARK_NOSE_TIP: 17,
        LANDMARK_NOSE_TOP: 18,
        LANDMARK_NOSE_BOTTOM: 19,
        LANDMARK_NOSE_RIGHT: 20,
        LANDMARK_NOSE_LEFT: 21,
        LANDMARK_LIP_RIGHT: 22,
        LANDMARK_LIP_LEFT: 23,
        LANDMARK_UPPER_LIP_CENTER: 24,
        LANDMARK_UPPER_LIP_RIGHT: 25,
        LANDMARK_UPPER_LIP_LEFT: 26,
        LANDMARK_LOWER_LIP_CENTER: 27,
        LANDMARK_LOWER_LIP_RIGHT: 28,
        LANDMARK_LOWER_LIP_LEFT: 29,
        LANDMARK_FACE_BORDER_TOP_RIGHT: 30,
        LANDMARK_FACE_BORDER_TOP_LEFT: 31,
        LANDMARK_CHIN: 32,

        LANDMARK_GROUP_LEFT_EYE: 0x0001,
        LANDMARK_GROUP_RIGHT_EYE: 0x0002,
        LANDMARK_GROUP_RIGHT_EYEBROW: 0x0004,
        LANDMARK_GROUP_LEFT_EYEBROW: 0x0008,
        LANDMARK_GROUP_NOSE: 0x00010,
        LANDMARK_GROUP_MOUTH: 0x0020,
        LANDMARK_GROUP_JAW: 0x0040,

        ExpressionsData: {
            EXPRESSION_BROW_RAISER_LEFT: 0,
            EXPRESSION_BROW_RAISER_RIGHT: 1,
            EXPRESSION_BROW_LOWERER_LEFT: 2,
            EXPRESSION_BROW_LOWERER_RIGHT: 3,

            EXPRESSION_SMILE: 4,
            EXPRESSION_KISS: 5,
            EXPRESSION_MOUTH_OPEN: 6,

            EXPRESSION_EYES_CLOSED_LEFT: 7,
            EXPRESSION_EYES_CLOSED_RIGHT: 8,

            EXPRESSION_HEAD_TURN_LEFT: 9,
            EXPRESSION_HEAD_TURN_RIGHT: 10,
            EXPRESSION_HEAD_UP: 11,
            EXPRESSION_HEAD_DOWN: 12,
            EXPRESSION_HEAD_TILT_LEFT: 13,
            EXPRESSION_HEAD_TILT_RIGHT: 14,

            EXPRESSION_EYES_TURN_LEFT: 15,
            EXPRESSION_EYES_TURN_RIGHT: 16,
            EXPRESSION_EYES_UP: 17,
            EXPRESSION_EYES_DOWN: 18
        },

        AlertData: {
            ALERT_NEW_FACE_DETECTED: 1,	        //  a new face enters the FOV and its position and bounding rectangle is available. 
            ALERT_FACE_OUT_OF_FOV: 2,			//  a new face is out of field of view (even slightly). 
            ALERT_FACE_BACK_TO_FOV: 3,			//  a tracked face is back fully to field of view. 
            ALERT_FACE_OCCLUDED: 4,			    //  face is occluded by any object or hand (even slightly).
            ALERT_FACE_NO_LONGER_OCCLUDED: 5,   //  face is not occluded by any object or hand.
            ALERT_FACE_LOST: 6					//  a face could not be detected for too long, will be ignored.
        },

        ALERT_NAME_SIZE: 30
    },

    PXCMSenseManager: {
        CUID: -661306591,
        TIMEOUT_INFINITE: -1
    },

    PXCMCapture: {
        CUID: -2080953776,
        STREAM_LIMIT: 8,

        /**
         @enum StreamType
         Bit-OR'ed values of stream types, physical or virtual streams.
         */
        STREAM_TYPE_ANY: 0,          /* Unknown/undefined type */
        STREAM_TYPE_COLOR: 0x0001,     /* the color stream type  */
        STREAM_TYPE_DEPTH: 0x0002,     /* the depth stream type  */
        STREAM_TYPE_IR: 0x0004,     /* the infrared stream type */
        STREAM_TYPE_LEFT: 0x0008,     /* the stereoscopic left intensity image */
        STREAM_TYPE_RIGHT: 0x0010,     /* the stereoscopic right intensity image */

        /**
         @enum DeviceModel
         Describes the device model
         */
        DEVICE_MODEL_GENERIC: 0x00000000,    /* a generic device or unknown device */
        DEVICE_MODEL_IVCAM: 0x0020000E,    /* the Intel(R) RealSense(TM) 3D Camera */
        DEVICE_MODEL_DS4: 0x0020000F,    /* the Intel(R) RealSense(TM) DS4 Camera */

        /**
         @enum DeviceOrientation
         Describes the device orientation
         */
        DEVICE_ORIENTATION_ANY: 0x0,  /* Unknown orientation */
        DEVICE_ORIENTATION_USER_FACING: 0x1,  /* A user facing camera */
        DEVICE_ORIENTATION_WORLD_FACING: 0x2,  /* A world facing camera */

        Device: {
            CUID: 0x938401C4,

            /**
             @enum PowerLineFrequency
             Describes the power line compensation filter values.
             */
            POWER_LINE_FREQUENCY_DISABLED: 0,     /* Disabled power line frequency */
            POWER_LINE_FREQUENCY_50HZ: 1,         /* 50HZ power line frequency */
            POWER_LINE_FREQUENCY_60HZ: 2,         /* 60HZ power line frequency */

            /**
             @enum MirrorMode
             Describes the mirroring options.
             */
            MIRROR_MODE_DISABLED: 0,            /* Disabled. The images are displayed as in a world facing camera.  */
            MIRROR_MODE_HORIZONTAL: 1,          /* The images are horizontally mirrored as in a user facing camera. */

            /**
             @enum IVCAMAccuracy
             Describes the IVCAM accuracy.
             */
            IVCAM_ACCURACY_FINEST: 1,         /* The finest accuracy: 9 patterns */
            IVCAM_ACCURACY_MEDIAN: 2,         /* The median accuracy: 8 patterns (default) */
            IVCAM_ACCURACY_COARSE: 3,         /* The coarse accuracy: 7 patterns */

            /**
             @enum StreamOption
             Describes the steam options.
             */
            STREAM_OPTION_ANY: 0,
            STREAM_OPTION_DEPTH_PRECALCULATE_UVMAP: 0x0001
        }
    },

    PXCMFaceConfiguration: {
        CUID: 1195589960,

        STRATEGY_APPEARANCE_TIME: 0,
        STRATEGY_CLOSEST_TO_FARTHEST: 1,
        STRATEGY_FARTHEST_TO_CLOSEST: 2,
        STRATEGY_LEFT_TO_RIGHT: 3,
        STRATEGY_RIGHT_TO_LEFT: 4,

        SMOOTHING_DISABLED: 0,
        SMOOTHING_MEDIUM: 1,
        SMOOTHING_HIGH: 2,

        RecognitionConfiguration: {
            REGISTRATION_MODE_CONTINUOUS: 0,	//registers users automatically
            REGISTRATION_MODE_ON_DEMAND: 1,	//registers users on demand only
            STORAGE_NAME_SIZE: 50
        },

        FACE_MODE_COLOR: 0,
        FACE_MODE_COLOR_PLUS_DEPTH: 1
    },

    PXCMSession: {
        CUID: 542328147,

        /**
         @enum ImplGroup
         The SDK group I/O and algorithm modules into groups and subgroups.
         This is the enumerator for algorithm groups.
         */
        IMPL_GROUP_ANY: 0,             /* Undefine group */
        IMPL_GROUP_OBJECT_RECOGNITION: 0x00000001,    /* Object recognition algorithms */
        IMPL_GROUP_SPEECH_RECOGNITION: 0x00000002,    /* Speech recognition algorithms */
        IMPL_GROUP_SENSOR: 0x00000004,    /* I/O modules */
        IMPL_GROUP_CORE: 0x80000000,    /* Core SDK modules */
        IMPL_GROUP_USER: 0x40000000,    /* User defined algorithms */

        /**
         @enum ImplSubgroup
         The SDK group I/O and algorithm modules into groups and subgroups.
         This is the enumerator for algorithm subgroups.
         */
        IMPL_SUBGROUP_ANY                   : 0,            /* Undefined subgroup */
        IMPL_SUBGROUP_FACE_ANALYSIS         : 0x00000001,    /* face analysis subgroup */
        IMPL_SUBGROUP_GESTURE_RECOGNITION   : 0x00000010,    /* gesture recognition subgroup */
        IMPL_SUBGROUP_SEGMENTATION          : 0x00000020,    /* segmentation subgroup */
        IMPL_SUBGROUP_PULSE_ESTIMATION      : 0x00000040,    /* pulse estimation subgroup */
        IMPL_SUBGROUP_EMOTION_RECOGNITION   : 0x00000080,    /* emotion recognition subgroup */
        IMPL_SUBGROUP_OBJECT_TRACKING       : 0x00000100,    /* object detection subgroup */
        IMPL_SUBGROUP_3DSEG                 : 0x00000200,    /* user segmentation subgroup */
        IMPL_SUBGROUP_3DSCAN                : 0x00000400,    /* mesh capture subgroup */
        IMPL_SUBGROUP_AUDIO_CAPTURE         : 0x00000001,    /* audio capture subgroup */
        IMPL_SUBGROUP_VIDEO_CAPTURE         : 0x00000002,    /* video capture subgroup */
        IMPL_SUBGROUP_SPEECH_RECOGNITION    : 0x00000001,    /* speech recognition subgroup */
        IMPL_SUBGROUP_SPEECH_SYNTHESIS      : 0x00000002    /* speech synthesis subgroup */
    },

    PXCMSpeechRecognition: {
        CUID: 0x8013C527,
        NBEST_SIZE: 4,
        SENTENCE_BUFFER_SIZE: 1024,
        TAG_BUFFER_SIZE: 1024,

        /**
         @enum AlertType
         Enumerates all supported alert events.
         */
        ALERT_VOLUME_HIGH           : 0x00001,        /** The volume is too high. */
        ALERT_VOLUME_LOW            : 0x00002,        /** The volume is too low. */
        ALERT_SNR_LOW               : 0x00004,        /** Too much noise. */
        ALERT_SPEECH_UNRECOGNIZABLE : 0x00008,        /** There is some speech available but not recognizable. */
        ALERT_SPEECH_BEGIN          : 0x00010,        /** The begining of a speech. */
        ALERT_SPEECH_END            : 0x00020,        /** The end of a speech. */
        ALERT_RECOGNITION_ABORTED   : 0x00040,        /** The recognition is aborted due to device lost, engine error, etc. */
        ALERT_RECOGNITION_END: 0x00080,        /** The recognition is completed. The audio source no longer provides data. */

        /**
         @enum LanguageType
         Enumerate all supported languages.
         */
        LANGUAGE_US_ENGLISH : 0x53556e65,       /** US English */
        LANGUAGE_GB_ENGLISH : 0x42476e65,       /** British English */
        LANGUAGE_DE_GERMAN  : 0x45446564,        /** German */
        LANGUAGE_US_SPANISH : 0x53557365,       /** US Spanish */
        LANGUAGE_LA_SPANISH : 0x414c7365,       /** Latin American Spanish */
        LANGUAGE_FR_FRENCH  : 0x52467266,        /** French */
        LANGUAGE_IT_ITALIAN : 0x54497469,       /** Italian */
        LANGUAGE_JP_JAPANESE : 0x504a616a,      /** Japanese */
        LANGUAGE_CN_CHINESE : 0x4e43687a,       /** Simplified Chinese */
        LANGUAGE_BR_PORTUGUESE: 0x52427470,    /** Portuguese */

        /**
         @enum GrammarFileType
         Enumerate all supported grammar file types.
         */
        GFT_NONE              : 0,  /**  unspecified type, use filename extension */
        GFT_LIST              : 1,  /**  text file, list of commands */
        GFT_JSGF              : 2,  /**  Java Speech Grammar Format */
        GFT_COMPILED_CONTEXT  : 5,  /**  Previously compiled format (vendor specific) */

        /**
         @enum VocabFileType
         Enumerate all supported vocabulary file types.
         */
        VFT_NONE : 0,  /**  unspecified type, use filename extension */
        VFT_LIST : 1  /**  text file*/
    },

    /**
     This enumeration defines various return codes that SDK interfaces
     use.  Negative values indicate errors, a zero value indicates success,
     and positive values indicate warnings.
     */
    PXCM_STATUS_NO_ERROR:0,
    PXCM_STATUS_FEATURE_UNSUPPORTED:     -1,     /* Unsupported feature */
    PXCM_STATUS_PARAM_UNSUPPORTED:       -2,     /* Unsupported parameter(s) */
    PXCM_STATUS_ITEM_UNAVAILABLE:        -3,     /* Item not found/not available */
    PXCM_STATUS_HANDLE_INVALID:          -101,   /* Invalid session, algorithm instance, or pointer */
    PXCM_STATUS_ALLOC_FAILED:            -102,   /* Memory allocation failure */
    PXCM_STATUS_DEVICE_FAILED:           -201,   /* Acceleration device failed/lost */
    PXCM_STATUS_DEVICE_LOST:             -202,   /* Acceleration device lost */
    PXCM_STATUS_DEVICE_BUSY:             -203,   /* Acceleration device busy */
    PXCM_STATUS_EXEC_ABORTED:            -301,   /* Execution aborted due to errors in upstream components */
    PXCM_STATUS_EXEC_INPROGRESS:         -302,   /* Asynchronous operation is in execution */
    PXCM_STATUS_EXEC_TIMEOUT:            -303,   /* Operation time out */
    PXCM_STATUS_FILE_WRITE_FAILED:       -401,   /** Failure in open file in WRITE mode */
    PXCM_STATUS_FILE_READ_FAILED:        -402,   /** Failure in open file in READ mode */
    PXCM_STATUS_FILE_CLOSE_FAILED:       -403,   /** Failure in close a file handle */
    PXCM_STATUS_DATA_UNAVAILABLE:         -501,   /** Data not available for MW model or processing */
    PXCM_STATUS_DATA_NOT_INITIALIZED:	 -502,	/** Data failed to initialize */
    PXCM_STATUS_INIT_FAILED:             -503,   /** Module failure during initialization */
    PXCM_STATUS_STREAM_CONFIG_CHANGED:           -601,   /** Configuration for the stream has changed */
    PXCM_STATUS_POWER_UID_ALREADY_REGISTERED:    -701,
    PXCM_STATUS_POWER_UID_NOT_REGISTERED:        -702,
    PXCM_STATUS_POWER_ILLEGAL_STATE:             -703,
    PXCM_STATUS_POWER_PROVIDER_NOT_EXISTS:       -704,
    PXCM_STATUS_CAPTURE_CONFIG_ALREADY_SET : -801, /** parameter cannot be changed since configuration for capturing has been already set */
    PXCM_STATUS_TIME_GAP:                101,    /* time gap in time stamps */
    PXCM_STATUS_PARAM_INPLACE:           102,    /* the same parameters already defined */
    PXCM_STATUS_DATA_NOT_CHANGED:        103,	 /* Data not changed (no new data available)*/
    PXCM_STATUS_PROCESS_FAILED:          104     /* Module failure during processing */
};

/** Create an instance of the PXCMSenseManager .
 @return Promise object with PXCMSenseManager object in success callback.
 */
PXCMSenseManager_CreateInstance = function () {
    if (RealSense.connection == null) RealSense.connection = new RealSenseConnection();
    return RealSense.connection.call(0, 'PXCMSenseManager_CreateInstance', { 'js_version': RealSenseVersion }).then(function (result) {
        return new PXCMSenseManager(result.instance.value);
    })
};

/** Create an instance of the PXCMSession.
 @return Promise object with PXCMSePXCMSessionnseManager object in success callback.
 */
PXCMSession_CreateInstance = function () {
    if (RealSense.connection == null) RealSense.connection = new RealSenseConnection();
    return RealSense.connection.call(0, 'PXCMSession_CreateInstance', { 'js_version': RealSenseVersion }).then(function (result) {
        return new PXCMSession(result.instance.value);
    })
};

function PXCMBase(instance) {
    //var prefix = name.concat('_');
    var self = this;

    /** Call module function by function name
     @param {Boolean}    functionName        Full function name like 'PXCMSession_QueryVersion'
     @param {Object}     functionParams      Function input parameters (same property names as in C++/C# interfaces)
     @return Funtion output (output parameters in C++/C# interfaces) as a promise object
     */
    this.Invoke = function (functionName, functionParams) {
        return RealSense.connection.call(instance, functionName, functionParams);
    }
}

/**
 This is the main object for the Intel® RealSense™ SDK pipeline.
 Control the pipeline execution with this interface.
 */
function PXCMSenseManager(instance) {
    var self = this;
    this.mid_callbacks = {};

    /** Enable the hand module in the SenseManager pipeline.
     @param {function} onData    Callback function to receive per-frame recognition results
     @return Promise object
     */
    this.EnableHand = function (onData) {
        return this.EnableModule(pxcmConst.PXCMHandModule.CUID, 0, onData);
    };

    /** Enable the face module in the SenseManager pipeline.
     @param {function} onData    Callback function to receive per-frame recognition results
     @return Promise object
     */
    this.EnableFace = function (onData) {
        return this.EnableModule(pxcmConst.PXCMFaceModule.CUID, 0, onData);
    };

    /** Query the PXCMCaptureManager object for changing capture configuration
     @return Promise object with PXCMCaptureManager object in success callback
     */
    this.QueryCaptureManager = function () {
        return RealSense.connection.call(instance, 'PXCMSenseManager_QueryCaptureManager').then(function (result) {
            return new PXCMCaptureManager(result.instance.value);
        });
    };

    /** Initialize the SenseManager pipeline for streaming with callbacks. The application must
     enable raw streams or algorithm modules before this function.
     @param {function} onConnect     Optional callback when there is a device connection or disconnection
     @param {function} onStatus      Optional callback
     @return Promise object
     */
    this.Init = function (onConnect, onStatus) {
        if (onConnect !== 'undefined' && onConnect != null) {
            RealSense.connection.subscribe_callback("PXCMSenseManager_OnConnect", this, onConnect);
        }
        if (onStatus !== 'undefined' && onStatus != null) {
            RealSense.connection.subscribe_callback("PXCMSenseManager_OnStatus", this, onStatus);
        }
        return RealSense.connection.call(instance, 'PXCMSenseManager_Init', {
            'handler': true,
            'onModuleProcessedFrame': true,
            'onConnect': onConnect !== 'undefined' && onConnect != null,
            'onStatus': onStatus !== 'undefined' && onStatus != null,
            'attachDataToCallbacks': true /*, 'onImageSamples': true, 'addRefImages': true*/
        }, 20000); // Connection to camera may take long time
    };

    /** Start streaming with reporting per-frame recognition results to callbacks specified in Enable* functions.
     The application must initialize the pipeline before calling this function.
     @return Promise object
     */
    this.StreamFrames = function () {
        return RealSense.connection.call(instance, 'PXCMSenseManager_StreamFrames', { blocking: false });
    };

    /** Pause/Resume the execution of the hand module.
     @param {Boolean} pause        If true, pause the module. Otherwise, resume the module.
     @return Promise object
     */
    this.PauseHand = function (pause) {
        return this.PauseModule(pxcmConst.PXCMHandModule.CUID, pause);
    };

    /** Pause/Resume the execution of the face module.
     @param {Boolean} pause        If true, pause the module. Otherwise, resume the module.
     @return Promise object
     */
    this.PauseFace = function (pause) {
        return this.PauseModule(pxcmConst.PXCMFaceModule.CUID, pause);
    };

    /** Close the execution pipeline.
     @return Promise object
     */
    this.Close = function () {
        return RealSense.connection.call(instance, 'PXCMSenseManager_Close');
    };

    ///////////////////////////////////////////////////////////////
    // Internal functions

    this.EnableModule = function (mid, mdesc, onData) {
        this.mid_callbacks[mid] = { callback: onData };
        var res;
        return RealSense.connection.call(instance, 'PXCMSenseManager_EnableModule', { mid: mid, mdesc: mdesc }).then(function (result) {
            res = result;
            return RealSense.connection.call(instance, 'PXCMSenseManager_QueryModule', { mid: mid });
        }).then(function (result2) {
            res.instance = result2.instance.value;
            self.mid_callbacks[mid].instance = result2.instance.value;
            var module = null;
            if (mid == pxcmConst.PXCMFaceModule.CUID) module = new PXCMFaceModule(result2.instance.value); else
            if (mid == pxcmConst.PXCMHandModule.CUID) module = new PXCMHandModule(result2.instance.value); else
                module = new PXCMBase(result2.instance.value);
            self.mid_callbacks[mid].module_instance = result2.instance.value;
            self.mid_callbacks[mid].module = module;
            return module;
        });
    };

    this.PauseModule = function (mid, pause) {
        return RealSense.connection.call(instance, 'PXCMSenseManager_PauseModule', { 'mid': mid, 'pause': pause });
    };

    this.EnableStreams = function (sdesc, onData) {
        this.mid_callbacks[mid] = { callback: onData };
        return RealSense.connection.call(instance, 'PXCMSenseManager_EnableStreams', { 'sdesc': sdesc });
    };

    this.OnModuleProcessedFrame = function (response, self) {
        if (self.mid_callbacks[response.mid]) {
            var callback = self.mid_callbacks[response.mid].callback;
            var module = self.mid_callbacks[response.mid].module;
            //var result = response.result;
            //result.instance = self.mid_callbacks[response.mid].instance;
            callback(response.mid, module, response);
            return;
        }
    };

    RealSense.connection.subscribe_callback("PXCMSenseManager_OnModuleProcessedFrame", this, this.OnModuleProcessedFrame);
}

function PXCMCaptureManager(instance) {
    var self = this;

    /**
     @brief    Return the stream resolution of the specified stream type.
     @param {Number} type    The stream type, COLOR=1, DEPTH=2
     @return Promise object with property 'size' : { 'width' : Number, 'height' : Number }
     */
    this.QueryImageSize = function (type) {
        return RealSense.connection.call(instance, 'PXCMCaptureManager_QueryImageSize', { 'type': type });
    }
}

function PXCMHandModule(instance) {
    var self = this;

    /**
     Create a new instance of the hand-module's active configuration.
     @return Configuration instance as a promise object
     */
    this.CreateActiveConfiguration = function () {
        return RealSense.connection.call(instance, 'PXCMHandModule_CreateActiveConfiguration').then(function (result) {
            return new PXCMHandConfiguration(result.instance.value);
        });
    };
}

function PXCMHandConfiguration(instance) {
    var self = this;

    /** Enable all gestures
     @param {Boolean} continuousGesture  Set to "true" to get an event at every frame, or "false" to get only start and end states of the gesture
     @return Promise object
     */
    this.EnableAllGestures = function (continuousGesture) {
        return RealSense.connection.call(instance, 'PXCMHandConfiguration_EnableAllGestures', {'continuousGesture': continuousGesture});
    };

    /** Enable a single gesture
     @param {String} gestureName
     @param {Boolean} continuousGesture  Set to "true" to get an event at every frame, or "false" to get only start and end states of the gesture
     @return Promise object
     */
    this.EnableGesture = function (gestureName, continuousGesture) {
        return RealSense.connection.call(instance, 'PXCMHandConfiguration_EnableGesture', { 'gestureName': gestureName, 'continuousGesture': continuousGesture });
    };

    /** Enable all alert messages.
     @return Promise object
     */
    this.EnableAllAlerts = function () {
        return RealSense.connection.call(instance, 'PXCMHandConfiguration_EnableAllAlerts');
    };

    /** Disable all gestures
     @return Promise object
     */
    this.DisableAllGestures = function () {
        return RealSense.connection.call(instance, 'PXCMHandConfiguration_DisableAllGestures');
    };

    /** Disable all alert messages.
     @return Promise object
     */
    this.DisableAllAlerts = function () {
        return RealSense.connection.call(instance, 'PXCMHandConfiguration_DisableAllAlerts');
    };

    /** Commit the configuration changes to the module
     This method must be called in order for any configuration changes to actually apply
     @return Promise object
     */
    this.ApplyChanges = function () {
        return RealSense.connection.call(instance, 'PXCMHandConfiguration_ApplyChanges');
    }
}

function PXCMFaceModule(instance) {
    var self = this;

    /**
     Create a new instance of the face-module's active configuration.
     @return Configuration instance as a promise object
     */
    this.CreateActiveConfiguration = function () {
        var config;
        return RealSense.connection.call(instance, 'PXCMFaceModule_CreateActiveConfiguration').then(function (result) {
            config = new PXCMFaceConfiguration(result.instance.value);
            return RealSense.connection.call(result.instance.value, 'PXCMFaceConfiguration_GetConfigurations');
        }).then(function (result) {
            config.configs = result.configs;
            return config;
        });
    }
}

function PXCMFaceConfiguration(instance) {
    var self = this;
    var configs; // current configuration

    /** Set tracking mode.
     @param {Number} FACE_MODE_COLOR (0) or FACE_MODE_COLOR_PLUS_DEPTH (1)
     @return Promise object
     */
    this.SetTrackingMode = function (trackingMode) {
        return RealSense.connection.call(instance, 'PXCMFaceConfiguration_SetTrackingMode', {'trackingMode': trackingMode});
    };

    /** Commit the configuration changes to the module
     This method must be called in order for any configuration changes to actually apply
     @return Promise object
     */
    this.ApplyChanges = function () {
        return RealSense.connection.call(instance, 'PXCMFaceConfiguration_ApplyChanges', {'configs': this.configs});
    };
}

function PXCMSession(instance) {
    var self = this;

    /**
     @brief Return the SDK version.
     @return Promise object with the SDK version.
     */
    this.QueryVersion = function () {
        return RealSense.connection.call(instance, 'PXCMSession_QueryVersion');
    };

    /**
     @brief Search a module implementation.
     @param[in]    templat           The template for the module search.
     @param[in]    idx               The zero-based index to retrieve multiple matches.
     @return Promise object with module descritpor
     */
    this.QueryImpl = function (templat, idx) {
        return RealSense.connection.call(instance, 'PXCMSession_QueryImpl', { templat: templat, idx: idx });
    };

    /**
     @brief Create an instance of the specified module.
     @param[in]    desc              Optional module descriptor.
     @param[in]    iuid              Optional module implementation identifier.
     @param[in]    cuid              Interface identifier.
     @param[out]   instance          The created instance, to be returned.
     @return Requested object or PXCMBase object (if unknown interface) as a promise object
     */
    this.CreateImpl = function (desc, iuid, cuid) {
        self.cuid = cuid;
        return RealSense.connection.call(instance, 'PXCMSession_CreateImpl', { 'desc': desc, 'iuid': iuid, 'cuid': cuid }).then(function (result) {
            var object = null;
            if (self.cuid == pxcmConst.PXCMSenseManager.CUID) object = new PXCMSenseManager(result.instance.value);
            if (self.cuid == pxcmConst.PXCMCaptureManager.CUID) object = new PXCMCaptureManager(result.instance.value);
            if (self.cuid == pxcmConst.PXCMSpeechRecognition.CUID) object = new PXCMSpeechRecognition(result.instance.value);
            if (self.cuid == pxcmConst.PXCMHandModule.CUID) object = new PXCMHandModule(result.instance.value);
            if (self.cuid == pxcmConst.PXCMHandConfiguration.CUID) object = new PXCMHandConfiguration(result.instance.value);
            if (self.cuid == pxcmConst.PXCMFaceModule.CUID) object = new PXCMFaceModule(result.instance.value);
            if (self.cuid == pxcmConst.PXCMFaceConfiguration.CUID) object = new PXCMFaceConfiguration(result.instance.value);
            if (object == null) object = new PXCMBase(result.instance.value);
            return object;
        })
    };

    /**
     @brief Return the module descriptor
     @param[in]  module          The module instance
     @return Promise object with module descriptor
     */
    this.QueryModuleDesc = function (module) {
        return RealSense.connection.call(instance, 'PXCMSession_QueryModuleDesc', { 'module': module.instance });
    }
}

function PXCMSpeechRecognition(instance) {
    var self = this;

    /**
     @brief The function returns the available algorithm configurations.
     @return Array of available configurations as Promise object
     */
    this.QuerySupportedProfiles = function (idx) {
        return RealSense.connection.call(instance, 'PXCMSpeechRecognition_QuerySupportedProfiles');
    };

    /**
     @brief The function returns the working algorithm configurations.
     @return The algorithm configuration, as Promise object
     */
    this.QueryProfile = function () {
        return RealSense.connection.call(instance, 'PXCMSpeechRecognition_QueryProfile', { 'idx': -1 });
    };

    /**
     @brief The function sets the working algorithm configurations.
     @param[in] config       The algorithm configuration.
     @return Promise object
     */
    this.SetProfile = function (config) {
        return RealSense.connection.call(instance, 'PXCMSpeechRecognition_SetProfile', { 'config': config });
    };

    /**
     @brief The function builds the recognition grammar from the list of strings.
     @param[in] gid          The grammar identifier. Can be any non-zero number.
     @param[in] cmds         The string list.
     @param[in] labels       Optional list of labels. If not provided, the labels are 1...ncmds.
     @return Promise object
     */
    this.BuildGrammarFromStringList = function (gid, cmds, labels) {
        return RealSense.connection.call(instance, 'PXCMSpeechRecognition_BuildGrammarFromStringList', { 'gid': gid, 'cmds': cmds, 'labels': labels });
    };

    /**
     @brief The function deletes the specified grammar and releases any resources allocated.
     @param[in] gid          The grammar identifier.
     @return Promise object
     */
    this.ReleaseGrammar = function (gid) {
        return RealSense.connection.call(instance, 'PXCMSpeechRecognition_ReleaseGrammar', { 'gid': gid });
    };

    /**
     @brief The function sets the active grammar for recognition.
     @param[in] gid          The grammar identifier.
     @return Promise object
     */
    this.SetGrammar = function (gid) {
        return RealSense.connection.call(instance, 'PXCMSpeechRecognition_SetGrammar', { 'gid': gid }, 30000); // Loading language model may take long time
    };

    /**
     @brief The function sets the dictation recognition mode.
     The function may take some time to initialize.
     @return Promise object
     */
    this.SetDictation = function () {
        return RealSense.connection.call(instance, 'PXCMSpeechRecognition_SetGrammar', { 'gid': 0 }, 30000); // Loading language model may take long time
    };

    /**
     @brief The function starts voice recognition.
     @param[in] OnRecognition    The callback function is invoked when there is some speech recognized.
     @param[in] handler          The callback function is triggered by any alert event.
     @return Promise object
     */
    this.StartRec = function (OnRecognition, OnAlert) {
        RealSense.connection.subscribe_callback("PXCMSpeechRecognition_OnRecognition", this, OnRecognition);
        RealSense.connection.subscribe_callback("PXCMSpeechRecognition_OnAlert", this, OnAlert);
        return RealSense.connection.call(instance, 'PXCMSpeechRecognition_StartRec', { 'handler': true, 'onRecognition': true, 'onAlert': true }, 20000); // Loading language model may take several seconds
    };

    /**
     @brief The function stops voice recognition immediately.
     @return Promise object
     */
    this.StopRec = function () {
        return RealSense.connection.call(instance, 'PXCMSpeechRecognition_StopRec', { });
    };
}

// layout of object received in face callback (callback specified in EnableFaceModule)
var FaceDataLayout = {
    timestamp: Number,
    faces: [{
        userID: Number,
        detection: {
            faceAverageDepth: Number,
            faceBoundingRect: {
                x: Number,
                y: Number,
                w: Number,
                h: Number
            }
        },
        landmarks: {
            landmarksPoints: [{
                label: Number,
                confidenceImage: Number,
                confidenceWorld: Number,
                world: {
                    x: Number,
                    y: Number,
                    z: Number
                },
                image: {
                    x: Number,
                    y: Number
                }
            }]
        },
        pose: {
            headPosition: {
                x: Number,
                y: Number,
                z: Number
            },
            poseEulerAngles: {
                yaw: Number,
                pitch: Number,
                roll: Number
            },
            poseQuaternion: {
                x: Number,
                y: Number,
                z: Number,
                w: Number
            }
        },
        expressions: {
            browRaiserLeft: Number,
            browRaiserRight: Number,
            browLowererLeft: Number,
            browLowererRight: Number,
            smile: Number,
            mouthOpen: Number,
            eyesClosedLeft: Number,
            eyesClosedRight: Number,
            headTurnLeft: Number,
            headTurnRight: Number,
            headUp: Number,
            headDown: Number,
            headTiltLeft: Number,
            headTiltRight: Number,
            eyesTurnLeft: Number,
            eyesTurnRight: Number,
            eyesUp: Number,
            eyesDown: Number
        }
    }],
    alerts: [{
        name: String,
        timeStamp: Number,
        faceId: Number
    }]
};

// layout of object received in hand callback (callback specified in EnableHandModule)
var HandDataLayout = {
    hands: [{
        uniqueId: Number,
        userId: Number,
        timeStamp: Number,
        isCalibrated: Boolean,
        bodySide: Number,
        openness : Number,
        boundingBoxImage: {
            x: Number,
            y: Number,
            w: Number,
            h: Number
        },
        massCenterImage: {
            x: Number,
            y: Number
        },
        massCenterWorld: {
            x: Number,
            y: Number,
            z: Number
        },
        palmOrientation: {
            x: Number,
            y: Number,
            z: Number,
            w: Number
        },
        extremityPoints: [{
            pointWorld: {
                x: Number,
                y: Number,
                z: Number
            },
            pointImage: {
                x: Number,
                y: Number,
                z: Number
            }
        }],
        fingerData: [{
            foldedness: Number,
            radius: Number
        }],
        trackedJoint: [{
            confidence: Number,
            positionWorld: {
                x: Number,
                y: Number,
                z: Number
            },
            positionImage: {
                x: Number,
                y: Number,
                z: Number
            },
            localRotation: {
                x: Number,
                y: Number,
                z: Number,
                w: Number
            },
            globalOrientation: {
                x: Number,
                y: Number,
                z: Number,
                w: Number
            },
            speed: {
                x: Number,
                y: Number,
                z: Number
            }
        }],
        normalizedJoint: [{
            confidence: Number,
            positionWorld: {
                x: Number,
                y: Number,
                z: Number
            },
            positionImage: {
                x: Number,
                y: Number,
                z: Number
            },
            localRotation: {
                x: Number,
                y: Number,
                z: Number,
                w: Number
            },
            globalOrientation: {
                x: Number,
                y: Number,
                z: Number,
                w: Number
            },
            speed: {
                x: Number,
                y: Number,
                z: Number
            }
        }]
    }],
    alerts: [{
        label: Number,
        handId: Number,
        timeStamp: Number,
        frameNumber: Number
    }],
    gestures: [{
        timeStamp: Number,
        handId: Number,
        state: Number,
        frameNumber: Number,
        name: String
    }]
};

//////////////////////////////////////////////////////////////////////////////////
// Internal object for websocket communication

function RealSenseConnection() {
    this.socketUrl = 'ws://localhost:4181';

    var self = this;
    var noop = function () { };
    this.onmessage = noop;
    this.onopen = noop;
    this.onclose = noop;
    this.onerror = noop;

    this.queue = [];        // queue before websocket is open
    this.websocket = null;  // WebSocket object
    this.request_array = {};// Requests by request id
    this.request_id = 0;    // Increment on every message
    this.callbacks = {};    // Callbacks from server
    this.binary_data = null;// Data received in last binary message

    this.call = function (instance, method, params, timeout) {
        params = params || {};      // Empty params by default
        timeout = timeout || 10000; // Default timeout in ms for response from server

        if (!("WebSocket" in window)) throw "WebSocket not available";

        if (this.websocket === null || this.websocket.readyState > 1) { // Create WebSocket if not created or closed
            this.websocket = new WebSocket(this.socketUrl);
            this.websocket.binaryType = "arraybuffer"; // Receive binary messages as ArrayBuffer
            this.websocket.onopen = function (event) { self._onopen(event); };
            this.websocket.onmessage = function (event) { self._onmessage(event); };
            this.websocket.onerror = this.onerror;
            this.websocket.onclose = this.onclose;
        }

        // Construct request as id+instance+method+params
        var request = params;
        request.id = ++this.request_id;
        request.instance = { value: instance };
        request.method = method;

        // Convert request to JSON string
        var request_text = JSON.stringify(request);

        // Send request or put request into queue (if socket still in CONNECTING state)
        if (this.websocket.readyState == 0) {
            this.queue.push(request_text);
        } else if (this.websocket.readyState == 1) {
            this.websocket.send(request_text);
        }

        // Create promise object
        var promise = new Promise(function (resolve, reject) {
            request.resolve = resolve;
            request.reject = reject;
        });

        // Add timeout handler
        request.timeoutHandler = function () {
            if (RealSense.connection.websocket.readyState > 1) {
                this.reject({ 'error': 'error opening websocket' });
            } else {
                this.reject({ 'error': 'request timeout on method ' + request.method });
            }
        };
        if (this.websocket.readyState > 1) {
            request.reject({ 'error': 'error opening websocket' });
        } else {
            request.timeout_id = setTimeout(function () { request.timeoutHandler() }, timeout)
        }

        // Store request by id
        this.request_array[request.id] = request;

        return promise;
    };

    // Send queued messages when socket is open
    this._onopen = function (event) {
        self.onopen(event);
        for (var i = 0; i < self.queue.length; i++) {
            self.websocket.send(self.queue[i]);
        }
        self.queue = [];
    };

    // Message handler
    this._onmessage = function (event) {
        if (event.data instanceof ArrayBuffer) {
            this.binary_data = new Uint8Array(event.data);
            //this.onmessage(event.data);
            return;
        }

        // Parse JSON
        var response;
        try {
            var t0 = performance.now();
            response = JSON.parse(event.data);
            var t1 = performance.now();
            response.parse_time = t1 - t0;
        } catch (err) {
            this.onmessage(event.data, null);
            return;
        }
        if (typeof response !== 'object') return; // error parsing JSON

        if (response.method !== 'undefined' && this.callbacks[response.method]) { // callback from server
            var callback = this.callbacks[response.method].callback;
            var obj = this.callbacks[response.method].obj;
            callback(response, obj);
            return;
        } else if (response.id !== 'undefined' && this.request_array[response.id]) { // result from server
            // Attach request to response object and remove from array
            response.request = this.request_array[response.id];
            delete this.request_array[response.id];

            clearTimeout(response.request.timeout_id);

            if (this.binary_data != null) {
                response.binary_data = this.binary_data;
            }

            // if error or status<0
            if ('error' in response || ('status' in response && response.status < 0)) {
                response.request.reject(response);
            } else {
                response.request.resolve(response);
            }
            //return;
        }

        // Unknown message from server, pass it to onmessage handler
        this.onmessage(event.data, response);
    };

    // Subscribe to callback from server
    this.subscribe_callback = function (method, obj_ptr, callback) {
        this.callbacks[method] = { obj: obj_ptr, callback: callback };
    };
}

// *************************************************************************** //
/*******************************************************************************

 INTEL CORPORATION PROPRIETARY INFORMATION
 This software is supplied under the terms of l license agreement or nondisclosure
 agreement with Intel Corporation and may not be copied or disclosed except in
 accordance with the terms of that agreement
 Copyright(c) 2014 Intel Corporation. All Rights Reserved.

 *******************************************************************************/

/**
 * @function RealSenseInfo
 * Returns information about platform compatibility with Intel® RealSense™ and HTTP link(s) if installation/update required
 *
 * @param [String] components   Array of strings with name of required components, for example ['face', 'hand']
 * @param {Function} callback   Callback receives object with the following properties
 *  IsReady             {Boolean} if true, platform ready to run Intel® RealSense™ SDK
 *  IsBrowserSupported  {Boolean} if false, browser doesn't support web sockets
 *  IsPlatformSupported {Boolean} if false, platform doesn't have Intel® RealSense™ 3D Camera
 *  Updates             {Array}   if not empty, array of required installation/update as array of object(s) with the following properties
 url  {String} HTTP address
 name {String} Friendly name
 href {String} HTTP link with address and name

 Example:
 RealSenseInfo(['face3d', 'hand'], function (info) {
      // check if (info.IsReady == true)
   })
 */

function RealSenseInfo(components, callback) {
    var RUNTIME_VERSION = "3.0";
    var RUNTIME_NAME = "Intel(R) RealSense(TM) SDK runtime setup";
    var RUNTIME_URL = "https://software.intel.com/en-us/realsense/websetup_latest.exe";

    versionCompare = function (left, right) {
        if (typeof left != 'string') return 0;
        var l = left.split('.');

        if (typeof right != 'string') return 0;
        var r = right.split('.');

        var length = Math.max(l.length, r.length);

        for (i = 0; i < length; i++) {
            if ((l[i] && !r[i] && parseInt(l[i]) > 0) || (parseInt(l[i]) > parseInt(r[i]))) {
                return 1;
            } else if ((r[i] && !l[i] && parseInt(r[i]) > 0) || (parseInt(l[i]) < parseInt(r[i]))) {
                return -1;
            }
        }

        return 0;
    };

    try {
        var xhr = new XMLHttpRequest();
        var url = 'http://localhost:4182/Intel/RealSense/v3/' + JSON.stringify(components);
        xhr.open("GET", url, true);
        xhr.timeout = 1000;
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && xhr.responseText.length > 0) {
                var info = JSON.parse(xhr.responseText);
                info.responseText = xhr.responseText;
                info.IsBrowserSupported = "WebSocket" in window;
                info.IsPlatformSupported = 'DCM' in info;
                info.Updates = [];
                if (info.IsPlatformSupported) {
                    var update = false;
                    //if (versionCompare(DCM_VERSION, info.DCM_version) > 0) info.Updates.push({ 'url': DCM_URL, 'name': DCM_NAME, 'href' : '<l href="' + DCM_URL + '">' + DCM_NAME + '</l>' });
                    if (!('runtime' in info) || versionCompare(RUNTIME_VERSION, info.runtime) > 0) update = true;
                    if (components != null) {
                        for (i = 0; i < components.length; i++) {
                            if (!(components[i] in info)) update = true;
                        }
                    }
                    if (update) info.Updates.push({
                        'url': RUNTIME_URL,
                        'name': RUNTIME_NAME,
                        'href': '<l href="' + RUNTIME_URL + '">' + RUNTIME_NAME + '</l>'
                    });
                }
                info.IsReady = info.IsPlatformSupported && info.IsBrowserSupported && info.Updates.length == 0;
                callback(info);
            }
        };
        xhr.ontimeout = function () {
            var info = {};
            info.responseText = 'Cannot get info from server';
            info.IsPlatformSupported = false;
            info.IsBrowserSupported = "WebSocket" in window;
            info.Updates = [];
            info.IsReady = false;
            callback(info);
        };
        xhr.send(null);
    } catch (exception) {
    }
}

// *************************************************************************** //
/// <reference path="./realsense.d.ts" />
var Throttler = (function () {
    function Throttler(minDelay) {
        this.minDelay = minDelay;
        this.lastCall = Date.now() - minDelay - 1;
    }
    Throttler.prototype.schedule = function (callee) {
        var dateNow = Date.now();
        if ((dateNow - this.minDelay) > this.lastCall) {
            this.lastCall = dateNow;
            callee.apply(callee);
        }
    };
    return Throttler;
})();
var RealSensePlugin = (function () {
    function RealSensePlugin() {
        this.alerts = false;
        this.gestures = true;
        this.pauseThrottler = new Throttler(1000);
        this.overviewThrottler = new Throttler(1000);
    }
    RealSensePlugin.prototype.checkPlatformCompatibility = function () {
        RealSenseInfo(['hand'], function (info) {
            if (info.IsReady == true) {
            }
            else {
            }
        });
    };
    RealSensePlugin.prototype.start = function () {
        var _this = this;
        //document.getElementById("Start").disabled = true;
        PXCMSenseManager_CreateInstance().then(function (result) {
            _this.sense = result;
            return _this.sense.EnableHand(_this.onHandData.bind(_this));
        }).then(function (result) {
            _this.handModule = result;
            _this.status('Init started');
            return _this.sense.Init(_this.onCameraConnect.bind(_this), _this.onCameraStatus.bind(_this));
        }).then(function (result) {
            return _this.handModule.CreateActiveConfiguration();
        }).then(function (result) {
            _this.handConfiguration = result;
            if (_this.alerts)
                return _this.handConfiguration.EnableAllAlerts();
            else
                return _this.handConfiguration.DisableAllAlerts();
        }).then(function (result) {
            if (_this.gestures)
                return _this.handConfiguration.EnableGesture("tap", false);
            else
                return _this.handConfiguration.DisableAllGestures();
        }).then(function (result) {
            if (_this.gestures)
                return _this.handConfiguration.EnableGesture("swipe", false);
            else
                return _this.handConfiguration.DisableAllGestures();
        }).then(function (result) {
            if (_this.gestures)
                return _this.handConfiguration.EnableGesture("v_sign", false);
            //  else
            //    return this.handConfiguration.DisableAllGestures();
            //}).then((result:any) => {
            //  if (this.gestures)
            //    return this.handConfiguration.EnableGesture("thumb_down", false);
            //  else
            //    return this.handConfiguration.DisableAllGestures();
        }).then(function (result) {
            return _this.handConfiguration.ApplyChanges();
        }).then(function (result) {
            return _this.sense.QueryCaptureManager();
        }).then(function (capture) {
            return capture.QueryImageSize(pxcmConst.PXCMCapture.STREAM_TYPE_DEPTH);
        }).then(function (result) {
            _this.imageSize = result.size;
            return _this.sense.StreamFrames();
        }).then(function (result) {
            _this.status('Streaming ' + _this.imageSize.width + 'x' + _this.imageSize.height);
            //document.getElementById("Stop").disabled = false;
        }).catch(function (error) {
            _this.status('Init failed: ' + JSON.stringify(error));
            //document.getElementById("Start").disabled = false;
        });
    };
    RealSensePlugin.prototype.onHandData = function (mid, module, data) {
        if (data.gestures && data.gestures.length > 0) {
            for (var g = 0; g < data.gestures.length; g++) {
                var gesture = data.gestures[g];
                if (gesture.name == 'tap' && gesture.state == 0 /* GESTURE_STATE_START */) {
                }
                else if (gesture.name == 'tap' && gesture.state == 2 /* GESTURE_STATE_END */) {
                    this.overviewThrottler.schedule(this.onTap);
                }
                else if (gesture.name == 'v_sign' && gesture.state == 0 /* GESTURE_STATE_START */) {
                }
                else if (gesture.name == 'v_sign' && gesture.state == 2 /* GESTURE_STATE_END */) {
                    this.pauseThrottler.schedule(this.onVSign);
                }
                else if (gesture.name == 'swipe' && gesture.state == 0 /* GESTURE_STATE_START */) {
                }
                else if (gesture.name == 'swipe' && gesture.state == 2 /* GESTURE_STATE_END */) {
                    // TODO: what if no hands ???  what if more hands ???
                    if (data.hands[0].bodySide == 2 /* BODY_SIDE_RIGHT */) {
                        this.onSwipeRight2Left();
                    }
                    if (data.hands[0].bodySide == 1 /* BODY_SIDE_LEFT */) {
                        this.onSwipeLeft2Right();
                    }
                }
                else {
                    if (console.log)
                        console.log("Gesture.name:" + gesture.name);
                }
            }
        }
    };
    RealSensePlugin.prototype.stop = function () {
        var _this = this;
        document.getElementById("Stop").disabled = true;
        this.sense.Close().then(function (result) {
            _this.status('Stopped');
            _this.fireOnDisConnected();
        });
    };
    RealSensePlugin.prototype.status = function (s) {
    };
    RealSensePlugin.prototype.onCameraConnect = function (data) {
        if (data.connected == true) {
            this.fireOnConnected();
        }
        else {
            this.fireOnDisConnected('Alert: ' + JSON.stringify(data));
        }
    };
    RealSensePlugin.prototype.onCameraStatus = function (data) {
        if (data.sts < 0) {
            this.status('Error ' + data.sts);
            this.fireOnError(true, data.sts);
        }
        else {
        }
    };
    RealSensePlugin.prototype.fireOnConnected = function () {
        if (this.onConnected) {
            try {
                this.onConnected.apply(this.onConnected);
            }
            catch (e) {
                if (console.log)
                    console.log("Error " + e);
            }
        }
    };
    RealSensePlugin.prototype.fireOnDisConnected = function (msg) {
        if (this.onDisConnected) {
            try {
                this.onDisConnected.apply(this.onDisConnected, [msg]);
            }
            catch (e) {
                if (console.log)
                    console.log("Error " + e);
            }
        }
    };
    RealSensePlugin.prototype.fireOnError = function (isError, msg) {
        if (this.onError) {
            try {
                this.onError.apply(this.onError, [isError, msg]);
            }
            catch (e) {
                if (console.log)
                    console.log("Error " + e);
            }
        }
    };
    RealSensePlugin.prototype.onSwipeRight2Left = function () {
        if (window['Reveal']) {
            window['Reveal'].right();
        }
        if (console.log)
            console.log("SWIPE right -> left");
    };
    RealSensePlugin.prototype.onSwipeLeft2Right = function () {
        if (window['Reveal']) {
            window['Reveal'].left();
        }
        if (console.log)
            console.log("SWIPE left -> right");
    };
    RealSensePlugin.prototype.onTap = function () {
        if (window['Reveal']) {
            window['Reveal'].toggleOverview();
        }
        if (console.log)
            console.log("tap");
    };
    RealSensePlugin.prototype.onVSign = function () {
        if (window['Reveal']) {
            window['Reveal'].togglePause();
        }
        if (console.log)
            console.log("v_sign");
    };
    return RealSensePlugin;
})();
var realSensePlugin = new RealSensePlugin();
realSensePlugin.checkPlatformCompatibility();
realSensePlugin.start();
