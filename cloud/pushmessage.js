//******Varibales Definition******//
var classnameModule = require('./classname');
var messageModule = require('./message');
var AV = require('leanengine');


var PF_PUSH_MESSAGE_TEXT            ="text"

var PF_PUSH_MESSAGE_TYPE    		="type"
var PF_PUSH_MESSAGE_TYPE_CHAT       ="chat"
var PF_PUSH_MESSAGE_TYPE_CARGO      ="cargo"
var PF_PUSH_MESSAGE_TYPE_FLIGHT     ="flight"
var PF_PUSH_MESSAGE_TYPE_EVENT      = "event"
var PF_PUSH_MESSAGE_TYPE_SYSTEM     = "system"

var PF_PUSH_MESSAGE_STATUS          ="status"
var PF_PUSH_MESSAGE_STATUS_SENT     ="sent"
var PF_PUSH_MESSAGE_STATUS_RECEIVED ="received"
var PF_PUSH_MESSAGE_STATUS_CLEAN    ="clean"

exports.PushCargoAssigned = function (cargo, flight, shipping) {
    var PushMessage = AV.Object.extend(classnameModule.GetPushMessageClass());
    var myPushMessage = new PushMessage();
    var content = "亲，您的包裹["+cargo.get("type")+"]被预定，请自行约定包裹交接，在此以前请不要打包以便开箱验视，感谢您的支持！";   

	var messageQuery = new AV.Query(PushMessage);
	messageQuery.equalTo("groupId", cargo.id);
	messageQuery.equalTo("type", PF_PUSH_MESSAGE_TYPE_CARGO);
	messageQuery.find().then(function (message) {
				if(message == null || message.length <= 0)
				{
				    myPushMessage.set("groupId", cargo.id);
					myPushMessage.add("dataList",shipping);
					myPushMessage.set("text", content);
					myPushMessage.set("status", PF_PUSH_MESSAGE_STATUS_SENT);
					myPushMessage.set("type", PF_PUSH_MESSAGE_TYPE_CARGO);
					myPushMessage.set("sendFrom", flight.get("owner"));
					myPushMessage.set("sendTo", cargo.get("owner"));
					myPushMessage.set("counter", 1);
					myPushMessage.save();
				}
				else{
					message[0].set("text", content);
					message[0].set("counter", message[0].get("counter")+1);
					message[0].save();
				}
			},function (error) {
					console.log(error.message);
	});

    var pushQuery = new AV.Query(AV.Installation);
    var cargoUser = cargo.get("owner");

    pushQuery.equalTo("user", cargoUser);
    //pushQuery.equalTo("appIdentifier", messageModule.appName());

    AV.Push.send({
        where: pushQuery, // Set our Installation query
        data: {
            alert:content,
			body:content,
			objectId:cargo.id,
			sound:'default',
			type:PF_PUSH_MESSAGE_TYPE_CARGO
        }
    }, {
        success: function () {
            console.log("PushCargoAssigned message: " + cargoUser.id + " Cargo: " + cargo.id + " Flight: " + flight.id);
            // Push was successful
        },
        error: function (error) {
            // Handle error
            console.log(error.message);
        }
    });
}



exports.PushFlightAssigned = function (cargo, flight, shipping) {
    var PushMessage = AV.Object.extend(classnameModule.GetPushMessageClass());
    var myPushMessage = new PushMessage();

    var content = "亲，您收到一个包裹["+cargo.get("type")+"], 请自行约定包裹交接，请当面开箱验视，感谢您的支持！";
	
	var messageQuery = new AV.Query(PushMessage);
	messageQuery.equalTo("groupId", flight.id);
	messageQuery.equalTo("type", PF_PUSH_MESSAGE_TYPE_FLIGHT);
	messageQuery.find().then(function (message) {           
				if(message == null || message.length <= 0)
				{
					myPushMessage.set("groupId", flight.id);
					myPushMessage.add("dataList",shipping);
					myPushMessage.set("text", content);
					myPushMessage.set("status", PF_PUSH_MESSAGE_STATUS_SENT);
					myPushMessage.set("type", PF_PUSH_MESSAGE_TYPE_FLIGHT);
					myPushMessage.set("sendFrom", cargo.get("owner"));
					myPushMessage.set("sendTo", flight.get("owner"));
					myPushMessage.set("counter",1);
					myPushMessage.save();
				}
				else
				{
					message[0].set("text", content);
					message[0].set("counter", message[0].get("counter")+1);
					message[0].save();
				}
			},function (error) {
					console.log(error.message);
	});
	

    var pushQuery = new AV.Query(AV.Installation);
    var flightUser = flight.get("owner");

    pushQuery.equalTo("user", flightUser);
    //pushQuery.equalTo("appIdentifier", messageModule.appName());

    AV.Push.send({
        where: pushQuery, // Set our Installation query
        data: {
			alert:content,
			body:content,
			objectId:flight.id,
			sound:'default',
			type:PF_PUSH_MESSAGE_TYPE_FLIGHT
        }
    }, {
        success: function () {
            // Push was successful
            console.log("PushFlightAssigned message: " + flightUser.id + " Cargo: " + cargo.id + " Flight: " + flight.id);
        },
        error: function (error) {
            // Handle error
            console.log(error.message);
        }
    });
}

exports.PushUserDetailVerifyStatus = function (userDetail) {
    var PushMessage = AV.Object.extend(classnameModule.GetPushMessageClass());
    var myPushMessage = new PushMessage();

    var message = '';
    if (userDetail.get("status") == messageModule.PF_USERDETAILS_STATUS_APPROVED())
        message = "恭喜您通过了soontake的实名认证，请重新登录,赶快上传行程赚点路费吧.";
    else if (userDetail.get("status") == messageModule.PF_USERDETAILS_STATUS_REJECTED())
        message = "您目前未通过soontake实名认证，原因'" + userDetail.get("reject_msg") + "',我们期待您完善资料.";

    myPushMessage.set("groupId", userDetail.id);
	myPushMessage.add("dataList",userDetail);
    myPushMessage.set("text", message);
    myPushMessage.set("status", PF_PUSH_MESSAGE_STATUS_SENT);
    myPushMessage.set("type", PF_PUSH_MESSAGE_TYPE_SYSTEM);
    myPushMessage.set("sendFrom", userDetail.get("owner"));
    myPushMessage.set("sendTo", userDetail.get("owner"));
	myPushMessage.set("counter", 1);
    myPushMessage.save();


    var pushQuery = new AV.Query(AV.Installation);

    pushQuery.equalTo("user", userDetail.get("owner"));
    //pushQuery.equalTo("appIdentifier", messageModule.appName());

    AV.Push.send({
        where: pushQuery, // Set our Installation query
        data: {
			alert:message,
			body:message,
			objectId:userDetail.id,
			sound:'default',
			type:PF_PUSH_MESSAGE_TYPE_SYSTEM
        }
    }, {
        success: function () {
            // Push was successful
            console.log(userDetail.get("owner").id + ", " + message);
        },
        error: function (error) {
            // Handle error
            console.log(error.message);
        }
    });
}

exports.PushShippingStatusUpdateToUser = function (shipping) {
    var PushMessage = AV.Object.extend(classnameModule.GetPushMessageClass());
    var myPushMessage = new PushMessage();
    
	var flight = shipping.get("flight");
	var cargo = shipping.get("cargo");
	var status = shipping.get("status");
    var content = "";
	if(status == messageModule.ShippingStatus_Sending())
		content = "亲，代运人拿到了您的包裹["+shipping.get("cargo").get("type")+"]."; 
	if(status == messageModule.ShippingStatus_Received())
		content = "亲，您的包裹["+shipping.get("cargo").get("type")+"]已送达，感谢您的支持！"
	
	var messageQuery = new AV.Query(PushMessage);
	//messageQuery.equalTo("groupId", shipping.id);
	messageQuery.equalTo("groupId", cargo.id);
	messageQuery.equalTo("type", PF_PUSH_MESSAGE_TYPE_CARGO);
	messageQuery.find().then(function (message) {
				if(message == null || message.length <= 0)
				{
					myPushMessage.set("groupId", shipping.id);
					myPushMessage.add("dataList",shipping);
					myPushMessage.set("text", content);
					myPushMessage.set("status", PF_PUSH_MESSAGE_STATUS_SENT);
					myPushMessage.set("type", PF_PUSH_MESSAGE_TYPE_CARGO);
					myPushMessage.set("sendFrom", flight.get("owner"));
					myPushMessage.set("sendTo", cargo.get("owner"));
					myPushMessage.set("counter", 1);
					myPushMessage.save();
				}
				else{
					message[0].set("text", content);
					message[0].set("counter", message[0].get("counter")+1);
					message[0].save();
				}
			},function (error) {
					console.log(error.message);
	});


    var pushQuery = new AV.Query(AV.Installation);
    var cargoUser = cargo.get("owner");

    pushQuery.equalTo("user", cargoUser);
    //pushQuery.equalTo("appIdentifier", messageModule.appName());

    AV.Push.send({
        where: pushQuery, // Set our Installation query
        data: {
			alert:content,
			body:content,
			objectId:shipping.id,
			sound:'default',
			type:PF_PUSH_MESSAGE_TYPE_SYSTEM
        }
    }, {
        success: function () {
            // Push was successful
            console.log("PushShippingStatusUpdateToUser message: Cargo: " + cargo.id + " to User: " + cargo.get("owner").id);
        },
        error: function (error) {
            // Handle error
            console.log(error.message);
        }
    });
}


exports.PushShippingCancelToUser = function (cargo, reasonCode) {
    var PushMessage = AV.Object.extend(classnameModule.GetPushMessageClass());
    var myPushMessage = new PushMessage();

    var content = "亲，您的包裹["+cargo.get("type")+"]已被取消，请重新等待代运人，感谢您的支持！";   
	
	var messageQuery = new AV.Query(PushMessage);
	messageQuery.equalTo("groupId", cargo.id);
	messageQuery.equalTo("type", PF_PUSH_MESSAGE_TYPE_CARGO);
	messageQuery.find().then(function (message) {
				if(message == null || message.length <= 0)
				{
					myPushMessage.set("groupId", cargo.id);
					myPushMessage.add("dataList",cargo);
					myPushMessage.set("text", content);
					myPushMessage.set("status", PF_PUSH_MESSAGE_STATUS_SENT);
					myPushMessage.set("type", PF_PUSH_MESSAGE_TYPE_CARGO);
					myPushMessage.set("sendFrom", cargo.get("owner"));
					myPushMessage.set("sendTo", cargo.get("owner"));
					myPushMessage.set("counter", 1);
					myPushMessage.save();
				}
				else{
					message[0].set("text", content);
					message[0].set("counter", message[0].get("counter")+1);
					message[0].save();
				}
			},function (error) {
					console.log(error.message);
	});

    var pushQuery = new AV.Query(AV.Installation);
    var cargoUser = cargo.get("owner");

    pushQuery.equalTo("user", cargoUser);
    //pushQuery.equalTo("appIdentifier", messageModule.appName());

    AV.Push.send({
        where: pushQuery, // Set our Installation query
        data: {
            alert:content,
			body:content,
			objectId:cargo.id,
			sound:'default',
			type:PF_PUSH_MESSAGE_TYPE_CARGO
        }
    }, {
        success: function () {
            console.log("PushShippingCancelToUser message: " + cargoUser.id + " Cargo: " + cargo.id);
            // Push was successful
        },
        error: function (error) {
            // Handle error
            console.log(error.message);
        }
    });
}
