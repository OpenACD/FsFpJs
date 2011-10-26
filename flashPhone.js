flashPhone = function(rtmpUrl, parentNode, OtherArgs){
	if(!window.swfobject){
		throw new Error('missing swfobject lib');
	}

	// Make the global callbacks by flash into events.
	this.eventNames = ["onConnected", "onHangup", "onLogin", 
		"onLogout", "onAttach", "onMakeCall", "onCallState", "onDisplayUpdate", 
		"onIncomingCall", "onEvent", "onDebug", "onInit", "onDisconnected"];
	for(var i = 0; i < this.eventNames.length; i++){
		if(window[this.eventNames[i]]){
			throw new Error(this.eventNames[i] + ' already defined');
		}
		(function(callbackName, thePhone){
			window[callbackName] = function(){
				var evt = flashPhone.createEvent(callbackName, arguments);
				thePhone.flashObject.dispatchEvent(evt);
				if(callbackName == "onConnected"){
					thePhone.sessionId = evt.sid;
				}
			}
		})(this.eventNames[i], this);
	}

	// create the flash phone itself and allow for some immediate events
	// that would otherwise be missed.
	var suppression = true;
	if(OtherArgs && (OtherArgs.suppressRingSound !== undefined)){
		suppression = OtherArgs.suppressRingSound;
	}
	var flashvars = {
		rtmp_url: 'rtmp://' + rtmpUrl + '/phone',
		suppressRingSound: suppression
	};
	var params = {
		allowScriptAccess: 'always'
	};

	swfobject.embedSWF("freeswitch.swf", parentNode, "250", "150", "9.0.0", "expressInstall.swf", flashvars, params, []);
	this.flashObject = document.getElementById(parentNode);
	if(OtherArgs){
		if(OtherArgs.onInit){
			this.flashObject.addEventListener("onInit", OtherArgs.onInit, false);
		}
		if(OtherArgs.onConnected){
			this.flashObject.addEventListener("onConnected", OtherArgs.onConnected, false);
		}
		if(OtherArgs.onDebug){
			this.flashObject.addEventListener("onDebug", OtherArgs.onDebug, false);
		}
	}

	// subscribe self to some important events.
	var iThis = this;
	this.flashObject.addEventListener("onLogin", function(loginEvent){
		iThis._onLogin(loginEvent);
	}, false);
	this.flashObject.addEventListener("onLogout", function(logoutEvent){
		iThis._onLogout(logoutEvent);
	}, false);
	this.flashObject.addEventListener("onIncomingCall", function(incomingEvent){
		iThis._onIncomingCall(incomingEvent);
	}, false);
	this.flashObject.addEventListener("onHangup", function(hupEvent){
		iThis._onHangup(hupEvent);
	}, false);
	this.flashObject.addEventListener("onMakeCall", function(callevent){
		iThis._onMakeCall(callevent);
	}, false);
}

flashPhone.prototype._onLogin = function(evt){
	console.log("das on login", this);
	if(evt.success == true){
		this.user = evt.user;
		this.domain = evt.domain;
		this.register();
	}
}

flashPhone.prototype._onLogout = function(evt){
	if(evt.user == this.user && evt.domain == this.domain){
		delete this.user;
		delete this.domain;
		delete this.registered;
	}
}

flashPhone.prototype._onIncomingCall = function(evt){
	console.log('handling incoming call', evt);
	if(this.oncallId || this.ringId){
		this.flashObject.hangup(evt.uuid);
	} else {
		this.ringId = evt.uuid;
	}
}

flashPhone.prototype._onHangup = function(evt){
	if(this.oncallId == evt.uuid){
		delete this.oncallId;
	} else if(this.ringId == evt.uuid){
		delete this.ringId;
	}
}

flashPhone.prototype._onMakeCall = function(callevent){
	delete this.ringId;
	this.oncallId = callevent.uuid;
}

flashPhone.createEvent = function(eventName, args){
	console.log('an event', eventName, args);
	var evt = document.createEvent("Event");
	evt.initEvent(eventName, true, true);
	switch(eventName){
		case "onConnected":
			evt.sid = args[0];
			break;
		case "onHangup":
			evt.uuid = args[0];
			evt.cause = args[1];
			break;
		case "onLogin":
			evt.result = args[0];
			if(evt.result == "success"){
				evt.success = true;
			} else {
				evt.success = false;
			}
			evt.user = args[1];
			evt.domain = args[2];
			break;
		case "onLogout":
			evt.user = args[0];
			evt.domain = args[1];
			break;
		case "onAttach":
			evt.uuid = args[0];
			break;
		case "onMakeCall":
			evt.uuid = args[0];
			evt.number = args[1];
			evt.account = args[2];
			break;
		case "onCallState":
			evt.uuid = args[0];
			evt.state = args[1];
			break;
		case "onDisplayUpdate":
			evt.uuid = args[0];
			evt.name = args[1];
			evet.number = args[2];
			break;
		case "onIncomingCall":
			evt.uuid = args[0];
			evt.name = args[1];
			evt.number = args[2];
			evt.account = args[3];
			evt['evt'] = args[4];
			break;
		case "onEvent":
			evt['event'] = args[0];
			break;
		case "onDebug":
			evt.message = args[0];
			break;
		case "onInit":
		case "onDisconnected":
			break;
	}
	return evt;
}

flashPhone.prototype.login = function(username, password, nick){
	if(this.user){
		return false;
	}
	this.nickname = nick;
	return this.flashObject.login(username, password);
}

flashPhone.prototype.logout = function(){
	return this.flashObject.logout();
}

flashPhone.prototype.makeCall = function(number, options){
	if(!options){
		options = {};
	}
	if(this.oncallId){
		return false;
	}
	if(! this.user){
		return false;
	}
	var user = this.user + "@" + this.domain;
	return this.flashObject.makeCall(number, user, options);
}

// TODO find out what attach done and potentially streamline
flashPhone.prototype.attach = function(uuid){
	return this.flashObject.attach(uuid);
}

flashPhone.prototype.answer = function(){
	if(! this.ringId){
		return false;
	}
	return this.flashObject.answer(this.ringId);
}

flashPhone.prototype.hangup = function(){
	var uuid;
	if(this.oncallId){
		uuid = this.oncallId;
	} else if(this.ringId){
		uuid = this.ringId;
	}
	if(! uuid){
		return false;
	}
	return this.flashObject.hangup(uuid);
}

flashPhone.prototype.sendDTMF = function(digit, duration){
	if(! duration){
		duration = 100;
	}
	return this.flashObject.sendDTMF(digit, duration);
}

flashPhone.prototype.register = function(user, domain, nick){
	if(this.registered){
		return false;
	}
	var fullUser;
	if(arguments.length == 0){
		if(! this.user){
			return false;
		}
		fullUser = this.user + "@" + this.domain;
		nick = this.nickname;
	} else if(arguments.length == 1){
		fullUser = arguments[0];
		nick = "";
	} else if(arguments.length == 2){
		fullUser = arguments[0];
		nick = arguments[1];
	} else {
		fullUser = user + "@" + domain;
	}
	this.registered = true;
	return this.flashObject.register(fullUser, nick);
}

flashPhone.prototype.unregister = function(account, nick){
	if(! user && ! this.user){
		return false;
	}
	if(! user){
		user = this.user + "@" + this.domain;
	}
	if(! nick){
		nick = "";
	}
	return this.flashObject.unregister(user, nick);
}

flashPhone.prototype.transfer = function(){
	var uuid, dest;
	if(arguments.length == 1){
		uuid = this.oncallId;
		dest = arguments[0];
	}
	if(arguments.length == 2){
		uuid = arguments[0];
		dest = arguments[1];
	}
	if(! uuid){
		return false;
	}
	return this.flashObject.transfer(uuid, dest);
}

flashPhone.prototype.threeWay = function(){
	var uuid1, uuid2;
	if(arguments.length == 1){
		uuid1 = this.oncallId;
		uuid2 = arguments[0];
	}
	if(arguments.length == 2){
		uuid1 = arguments[0];
		uuid2 = arguments[1];
	}
	if(! uuid1){
		return false;
	}
	return this.flashObject.three_way(uuid1, uuid2);
}

flashPhone.prototype.getMic = function(){
	return this.flashObject.getMic();
}

flashPhone.prototype.micList = function(){
	return this.flashObject.micList();
}

flashPhone.prototype.setMic = function(mic){
	return this.flashObject.setMic(mic);
}

flashPhone.prototype.isMuted = function(){
	return this.flashObject.isMuted;
}

flashPhone.prototype.showPrivacy = function(){
	return this.flashObject.showPrivacy();
}

flashPhone.prototype.connect = function(){
	return this.flashObject.connect();
}

// TODO confirm if we want this
flashPhone.prototype.disconnect = function(){
	return this.flashObject.disconnect();
}

// TODO What does join do?
flashPhone.prototype.join = function(){
	var selfId, otherId;
	if(arguments.length == 1){
		selfId = this.oncallId;
		otherId = arguments[0];
	}
	if(arguments.length == 2){
		selfId = arguments[0];
		otherId = arguments[1];
	}
	if(! selfId){
		return false;
	}
	return this.flashObject.join(selfId, otherId);
}

flashPhone.prototype.sendevent = function(evt){
	return this.flashObject.sendevent(evt);
}

flashPhone.prototype.setVolume = function(vol){
	return this.flashObject.setVolume(vol);
}

flashPhone.prototype.setMicVolume = function(vol){
	return this.flashObject.setMicVolume(vol);
}
