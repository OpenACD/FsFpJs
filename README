Project Overview
================

Takes the FreeSWITCH example flash based phone for use with thier mod_rtmp
and uncouples it from the provided UI and applies custom javascript events.
The goal is simplification and abstraction.

Use
===

Similar to using the original FreeSWITCH flash softphone, copy the following
to a webserver:

    ./flashPhone.js
    ./swfobject.js
    ./freeswitch.swf

Create a page that includes swfobject.js and flashPhone.js.  To create the
phone:

    var f = new flashPhone(<host>, <element_id_for_phone>);

To login and register:

    f.login(<username>, <password>, [nickname]);

After the log is complete, events can be registered.  If you need to handle
onInit or onConnected events, those should be passed into the constructor:

    var f = new flashPhone(<host>, <element_id_for_phone>, {
        onInit:function(){ console.log('flashPhone Initialized'); },
        onConnected:function(evt){ console.log('flashPhone connected'); }
		});
