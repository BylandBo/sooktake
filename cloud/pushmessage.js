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

var PF_PUSH_MESSAGE_TYPE_CHARGE = "charge"
var PF_PUSH_MESSAGE_TYPE_TRANSFER = "transfer"
var PF_PUSH_MESSAGE_TYPE_REFUND = "refund"

var PF_PUSH_MESSAGE_ACTION    ="com.soontake.PUSH"

exports.PushCargoAssigned = function (cargo, flight, shipping) {
    var PushMessage = AV.Object.extend(classnameModule.GetPushMessageClass());
    var myPushMessage = new PushMessage();
    var content = "亲，您的包裹["+cargo.get("type")+"]被预定，请自行约定包裹交接，在此以前请不要打包以便开箱验视，感谢您的支持！";   

	//add message history
	var History = AV.Object.extend(classnameModule.GetHistoryClass());
	var historyRecord = new History();
	historyRecord.set("type", PF_PUSH_MESSAGE_TYPE_CARGO);
	historyRecord.set("text", content);
	historyRecord.set("referenceId", cargo.id);
	historyRecord.save().then(
		function (history){
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
							myPushMessage.add("historyList",history);
							myPushMessage.set("lastShipping",shipping);
							myPushMessage.save();
						}
						else{
							var data = message[0].get("dataList");
							var shippingExist = false;
							if(data != null)
							{
								for(var i = 0; i<data.length; i++)
								{
								  if(data[i].id == shipping.id)
								  {
									shippingExist = true;
									break;
								  }
								}
							}
							if(!shippingExist)
							{
							  console.log("new shipping->"+shipping.id+" for cancelled cargo: "+cargo.id);
							  message[0].add("dataList",shipping);
							}
							message[0].set("text", content);
							message[0].set("counter", message[0].get("counter")+1);
							message[0].set("status", PF_PUSH_MESSAGE_STATUS_SENT);
							message[0].add("historyList",history);
							message[0].set("lastShipping",shipping);
							message[0].save();
						}
					},function (error) {
							console.log(error.message);
			});
		},
	    function(error) {
		   console.log(error.message);
	   }
	);

    var pushQuery = new AV.Query(AV.Installation);
    var cargoUser = cargo.get("owner");

    pushQuery.equalTo("user", cargoUser);
    //pushQuery.equalTo("appIdentifier", messageModule.appName());
    if(cargoUser != null && cargoUser != "" && typeof cargoUser !== 'undefined' )
	{
		AV.Push.send({
			where: pushQuery, // Set our Installation query
			data: {
				alert:content,
				body:content,
				objectId:cargo.id,
				sound:'default',
				type:PF_PUSH_MESSAGE_TYPE_CARGO,
				action:PF_PUSH_MESSAGE_ACTION
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
}



exports.PushFlightAssigned = function (cargo, flight, shipping) {
    var PushMessage = AV.Object.extend(classnameModule.GetPushMessageClass());
    var myPushMessage = new PushMessage();

    var content = "亲，您收到一个包裹["+cargo.get("type")+"], 请自行约定包裹交接，请当面开箱验视，感谢您的支持！";
	
	//add message history
	var History = AV.Object.extend(classnameModule.GetHistoryClass());
	var historyRecord = new History();
	historyRecord.set("type", PF_PUSH_MESSAGE_TYPE_FLIGHT);
	historyRecord.set("text", content);
	historyRecord.set("referenceId", flight.id);
	historyRecord.save().then(
		function (history){
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
							myPushMessage.add("historyList",history);
							myPushMessage.set("lastShipping",shipping);
							myPushMessage.save();
						}
						else
						{
							var data = message[0].get("dataList");
							var shippingExist = false;
							if(data != null)
							{
								for(var i = 0; i<data.length; i++)
								{
								  if(data[i].id == shipping.id)
								  {
									shippingExist = true;
									break;
								  }
								}
							}
							if(!shippingExist)
							{
							  console.log("new shipping->"+shipping.id+" for Flight: "+flight.id);
							  message[0].add("dataList",shipping);
							}
							message[0].set("text", content);
							message[0].set("counter", message[0].get("counter")+1);
							message[0].set("status", PF_PUSH_MESSAGE_STATUS_SENT);
							message[0].set("lastShipping", shipping);
							message[0].add("historyList",history);
							message[0].set("lastShipping",shipping);
							message[0].save();
						}
					},function (error) {
							console.log(error.message);
			});
		},
	    function(error) {
		   console.log(error.message);
	   }
	 );

    var pushQuery = new AV.Query(AV.Installation);
    var flightUser = flight.get("owner");

    pushQuery.equalTo("user", flightUser);
    //pushQuery.equalTo("appIdentifier", messageModule.appName());

	if(flightUser != null && flightUser != "" && typeof flightUser !== 'undefined' )
	{
		AV.Push.send({
			where: pushQuery, // Set our Installation query
			data: {
				alert:content,
				body:content,
				objectId:flight.id,
				sound:'default',
				type:PF_PUSH_MESSAGE_TYPE_FLIGHT,
				action:PF_PUSH_MESSAGE_ACTION
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
	var owner = userDetail.get("owner");
	if(owner != null && owner != "" && typeof owner !== 'undefined' )
	{
		AV.Push.send({
			where: pushQuery, // Set our Installation query
			data: {
				alert:message,
				body:message,
				objectId:userDetail.id,
				sound:'default',
				type:PF_PUSH_MESSAGE_TYPE_SYSTEM,
				action:PF_PUSH_MESSAGE_ACTION
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
	{
	   if(cargo.get("expressType") == messageModule.expressPost())
		content = "亲，您的包裹["+shipping.get("cargo").get("type")+"]已寄出，感谢您的支持！";
	   else
		content = "亲，您的包裹["+shipping.get("cargo").get("type")+"]已送达，感谢您的支持！";
	}
	
	//add message history
	var History = AV.Object.extend(classnameModule.GetHistoryClass());
	var historyRecord = new History();
	historyRecord.set("type", PF_PUSH_MESSAGE_TYPE_CARGO);
	historyRecord.set("text", content);
	historyRecord.set("referenceId", cargo.id);
	historyRecord.save().then(
		function (history){
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
							myPushMessage.add("historyList",history);
							myPushMessage.set("lastShipping",shipping);
							myPushMessage.save();
						}
						else{
							message[0].set("text", content);
							message[0].set("counter", message[0].get("counter")+1);
							message[0].set("status", PF_PUSH_MESSAGE_STATUS_SENT);
							message[0].set("lastShipping", shipping);
							message[0].add("historyList",history);
							message[0].save();
						}
					},function (error) {
							console.log(error.message);
			});
		},
		function(error) {
		   console.log(error.message);
	   }
	);	

    var pushQuery = new AV.Query(AV.Installation);
    var cargoUser = cargo.get("owner");

    pushQuery.equalTo("user", cargoUser);
    //pushQuery.equalTo("appIdentifier", messageModule.appName());

	if(cargoUser != null && cargoUser != "" && typeof cargoUser !== 'undefined' )
	{
		AV.Push.send({
			where: pushQuery, // Set our Installation query
			data: {
				alert:content,
				body:content,
				objectId:shipping.id,
				sound:'default',
				type:PF_PUSH_MESSAGE_TYPE_SYSTEM,
				action:PF_PUSH_MESSAGE_ACTION
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
}


exports.PushShippingCancelToUser = function (cargo, reasonCode) {
    var PushMessage = AV.Object.extend(classnameModule.GetPushMessageClass());
    var myPushMessage = new PushMessage();

    var content = "亲，您的包裹["+cargo.get("type")+"]已被取消，请重新等待代运人，感谢您的支持！";   
	
	//add message history
	var History = AV.Object.extend(classnameModule.GetHistoryClass());
	var historyRecord = new History();
	historyRecord.set("type", PF_PUSH_MESSAGE_TYPE_CARGO);
	historyRecord.set("text", content);
	historyRecord.set("referenceId", cargo.id);
	historyRecord.save().then(
		function (history){
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
							myPushMessage.add("historyList",history);
							myPushMessage.save();
						}
						else{
							message[0].set("text", content);
							message[0].set("counter", message[0].get("counter")+1);
							message[0].set("status", PF_PUSH_MESSAGE_STATUS_SENT);
							message[0].add("historyList",history);
							message[0].save();
						}
					},function (error) {
							console.log(error.message);
			});
		},
		function(error) {
		   console.log(error.message);
	   }
	);

    var pushQuery = new AV.Query(AV.Installation);
    var cargoUser = cargo.get("owner");

    pushQuery.equalTo("user", cargoUser);
    //pushQuery.equalTo("appIdentifier", messageModule.appName());

	if(cargoUser != null && cargoUser != "" && typeof cargoUser !== 'undefined' )
	{
		AV.Push.send({
			where: pushQuery, // Set our Installation query
			data: {
				alert:content,
				body:content,
				objectId:cargo.id,
				sound:'default',
				type:PF_PUSH_MESSAGE_TYPE_CARGO,
				action:PF_PUSH_MESSAGE_ACTION
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
}

exports.PushShippingCancelToFlightUser = function (cargo, flight, reasonCode) {
    var PushMessage = AV.Object.extend(classnameModule.GetPushMessageClass());
    var myPushMessage = new PushMessage();

    var content = "亲，您代运的包裹["+cargo.get("type")+"]已被取消，感谢您的支持！";   
	
	//add message history
	var History = AV.Object.extend(classnameModule.GetHistoryClass());
	var historyRecord = new History();
	historyRecord.set("type", PF_PUSH_MESSAGE_TYPE_FLIGHT);
	historyRecord.set("text", content);
	historyRecord.set("referenceId", flight.id);
	historyRecord.save().then(
		function (history){
			var messageQuery = new AV.Query(PushMessage);
			messageQuery.equalTo("groupId", flight.id);
			messageQuery.equalTo("type", PF_PUSH_MESSAGE_TYPE_FLIGHT);
			messageQuery.find().then(function (message) {
						if(message == null || message.length <= 0)
						{
							myPushMessage.set("groupId", flight.id);
							myPushMessage.add("dataList",flight);
							myPushMessage.set("text", content);
							myPushMessage.set("status", PF_PUSH_MESSAGE_STATUS_SENT);
							myPushMessage.set("type", PF_PUSH_MESSAGE_TYPE_FLIGHT);
							myPushMessage.set("sendFrom", flight.get("owner"));
							myPushMessage.set("sendTo", flight.get("owner"));
							myPushMessage.set("counter", 1);
							myPushMessage.add("historyList",history);
							myPushMessage.save();
						}
						else{
							message[0].set("text", content);
							message[0].set("counter", message[0].get("counter")+1);
							message[0].set("status", PF_PUSH_MESSAGE_STATUS_SENT);
							message[0].add("historyList",history);
							message[0].save();
						}
					},function (error) {
							console.log(error.message);
			});
		},
		function(error) {
		   console.log(error.message);
	   }
	);

    var pushQuery = new AV.Query(AV.Installation);
    var flightUser = flight.get("owner");

    pushQuery.equalTo("user", flightUser);
    //pushQuery.equalTo("appIdentifier", messageModule.appName());

	if(flightUser != null && flightUser != "" && typeof flightUser !== 'undefined' )
	{
		AV.Push.send({
			where: pushQuery, // Set our Installation query
			data: {
				alert:content,
				body:content,
				objectId:flight.id,
				sound:'default',
				type:PF_PUSH_MESSAGE_TYPE_CARGO,
				action:PF_PUSH_MESSAGE_ACTION
			}
		}, {
			success: function () {
				console.log("PushShippingCancelToFlightUser message: " + flightUser.id + " Cargo: " + cargo.id);
				// Push was successful
			},
			error: function (error) {
				// Handle error
				console.log(error.message);
			}
		});
	}
}

exports.PushPaymentTopupSucceedToUser = function (payment,amount,user) {
    var PushMessage = AV.Object.extend(classnameModule.GetPushMessageClass());
    var myPushMessage = new PushMessage();
    
    var content = "成功充值¥"+amount+"到您的Soontake帐号";
	
	myPushMessage.set("groupId", payment.id);
	myPushMessage.add("dataList",payment);
	myPushMessage.set("text", content);
	myPushMessage.set("status", PF_PUSH_MESSAGE_STATUS_SENT);
	myPushMessage.set("type", PF_PUSH_MESSAGE_TYPE_SYSTEM);
	myPushMessage.set("sendTo", user);
	myPushMessage.set("counter", 1);
	myPushMessage.save();
	
	
	var pushQuery = new AV.Query(AV.Installation);
	pushQuery.equalTo("user", user);

	if(user != null && user != "" && typeof user !== 'undefined' )
	{
		AV.Push.send({
			where: pushQuery, // Set our Installation query
			data: {
				alert:content,
				body:content,
				objectId:payment.id,
				sound:'default',
				type:PF_PUSH_MESSAGE_TYPE_SYSTEM,
				action:PF_PUSH_MESSAGE_ACTION
			}
		}, {
			success: function () {
				// Push was successful
				console.log("PushPaymentTopupSucceedToUser message: Payment: " + payment.id + " to User: " + user.id);
			},
			error: function (error) {
				// Handle error
				console.log(error.message);
			}
		});
	}
}

exports.PushWithdrawSucceedToUser = function (payment,amount,user) {
    var PushMessage = AV.Object.extend(classnameModule.GetPushMessageClass());
    var myPushMessage = new PushMessage();
    
    var content = "成功从您的Soontake帐号取款¥"+amount+"到您的微信账号";
	
	myPushMessage.set("groupId", payment.id);
	myPushMessage.add("dataList",payment);
	myPushMessage.set("text", content);
	myPushMessage.set("status", PF_PUSH_MESSAGE_STATUS_SENT);
	myPushMessage.set("type", PF_PUSH_MESSAGE_TYPE_SYSTEM);
	myPushMessage.set("sendTo", user);
	myPushMessage.set("counter", 1);
	myPushMessage.save();
	
	
	var pushQuery = new AV.Query(AV.Installation);
	pushQuery.equalTo("user", user);

	if(user != null && user != "" && typeof user !== 'undefined' )
	{
		AV.Push.send({
			where: pushQuery, // Set our Installation query
			data: {
				alert:content,
				body:content,
				objectId:payment.id,
				sound:'default',
				type:PF_PUSH_MESSAGE_TYPE_SYSTEM,
				action:PF_PUSH_MESSAGE_ACTION
			}
		}, {
			success: function () {
				// Push was successful
				console.log("PushWithdrawSucceedToUser message: Payment: " + payment.id + " to User: " + user.id);
			},
			error: function (error) {
				// Handle error
				console.log(error.message);
			}
		});
	}
}


exports.PushChargeShippingListSucceedToCargoUser = function (payment,amount,shipping,user) {
    var PushMessage = AV.Object.extend(classnameModule.GetPushMessageClass());
    var myPushMessage = new PushMessage();
    
	var cargo = shipping.get("cargo");
	var flight = shipping.get("flight");
	
	flight.fetch({
    include: "owner"
	  },
	  {
		success: function(post) {
		    var content = "成功支付¥"+amount+"给顺带君"+flight.get("owner").get("fullname")+"，包裹成功寄出以后，这笔钱将打入顺带君的账户(在此之前这笔钱将被冻结)";
	
			//add message history
			var History = AV.Object.extend(classnameModule.GetHistoryClass());
			var historyRecord = new History();
			historyRecord.set("type", PF_PUSH_MESSAGE_TYPE_CHARGE);
			historyRecord.set("text", content);
			historyRecord.set("referenceId", payment.id);
			historyRecord.save().then(
				function (history){
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
									myPushMessage.set("sendTo", cargo.get("owner"));
									myPushMessage.set("counter", 1);
									myPushMessage.add("historyList",history);
									myPushMessage.set("lastShipping",shipping);
									myPushMessage.save();
								}
								else{
									message[0].set("text", content);
									message[0].set("counter", message[0].get("counter")+1);
									message[0].set("status", PF_PUSH_MESSAGE_STATUS_SENT);
									message[0].add("historyList",history);
									message[0].set("lastShipping",shipping);
									message[0].save();
								}
							},function (error) {
									console.log(error.message);
					});
				},
				function(error) {
				   console.log(error.message);
			   }
			);
			
			    var pushQuery = new AV.Query(AV.Installation);
				var cargoUser = cargo.get("owner");

				pushQuery.equalTo("user", cargoUser);
				//pushQuery.equalTo("appIdentifier", messageModule.appName());
				if(cargoUser != null && cargoUser != "" && typeof cargoUser !== 'undefined' )
				{
					AV.Push.send({
						where: pushQuery, // Set our Installation query
						data: {
							alert:content,
							body:content,
							objectId:cargo.id,
							sound:'default',
							type:PF_PUSH_MESSAGE_TYPE_CHARGE,
							action:PF_PUSH_MESSAGE_ACTION
						}
					}, {
						success: function () {
							console.log("PushChargeShippingListSucceedToCargoUser message: Payment " + payment.id +" Cargo: " + cargo.id);
							// Push was successful
						},
						error: function (error) {
							// Handle error
							console.log(error.message);
						}
					});
				}
		}
	});
}

exports.PushChargeShippingListSucceedToFlightUser = function (payment,amount,shipping,user) {
    var PushMessage = AV.Object.extend(classnameModule.GetPushMessageClass());
    var myPushMessage = new PushMessage();

    var cargo = shipping.get("cargo");
	var flight = shipping.get("flight");
	
    var content = "包裹"+cargo.get("type")+"的运费¥"+amount+"已成功转入平台, 完成任务后，运费将到账您的账户";
		
	//add message history
	var History = AV.Object.extend(classnameModule.GetHistoryClass());
	var historyRecord = new History();
	historyRecord.set("type", PF_PUSH_MESSAGE_TYPE_CHARGE);
	historyRecord.set("text", content);
	historyRecord.set("referenceId", payment.id);
	historyRecord.save().then(
		function (history){
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
							myPushMessage.set("sendTo", flight.get("owner"));
							myPushMessage.set("counter",1);
							myPushMessage.add("historyList",history);
							myPushMessage.set("lastShipping",shipping);
							myPushMessage.save();
						}
						else
						{
							var data = message[0].get("dataList");
							var shippingExist = false;
							if(data != null)
							{
								for(var i = 0; i<data.length; i++)
								{
								  if(data[i].id == shipping.id)
								  {
									shippingExist = true;
									break;
								  }
								}
							}
							if(!shippingExist)
							{
							  console.log("new shipping->"+shipping.id+" for Flight: "+flight.id);
							  message[0].add("dataList",shipping);
							}
							message[0].set("text", content);
							message[0].set("counter", message[0].get("counter")+1);
							message[0].set("status", PF_PUSH_MESSAGE_STATUS_SENT);
							message[0].set("lastShipping", shipping);
							message[0].add("historyList",history);
							message[0].set("lastShipping",shipping);
							message[0].save();
						}
					},function (error) {
							console.log(error.message);
			});
		},
	    function(error) {
		   console.log(error.message);
	   }
	 );

    var pushQuery = new AV.Query(AV.Installation);
    var flightUser = flight.get("owner");

    pushQuery.equalTo("user", flightUser);
    //pushQuery.equalTo("appIdentifier", messageModule.appName());

	if(flightUser != null && flightUser != "" && typeof flightUser !== 'undefined' )
	{
		AV.Push.send({
			where: pushQuery, // Set our Installation query
			data: {
				alert:content,
				body:content,
				objectId:flight.id,
				sound:'default',
				type:PF_PUSH_MESSAGE_TYPE_FLIGHT,
				action:PF_PUSH_MESSAGE_ACTION
			}
		}, {
			success: function () {
				// Push was successful
				console.log("PushChargeShippingListSucceedToFlightUser message: " + flightUser.id + " Cargo: " + cargo.id + " Flight: " + flight.id);
			},
			error: function (error) {
				// Handle error
				console.log(error.message);
			}
		});
	}
}

exports.PushPaymentTransferToSenderSucceedToFlightUser = function (payment,amount,shipping,user) {
    var PushMessage = AV.Object.extend(classnameModule.GetPushMessageClass());
    var myPushMessage = new PushMessage();

    var cargo = shipping.get("cargo");
	var flight = shipping.get("flight");
	
    var content = "包裹"+cargo.get("type")+"的运费¥"+amount+"已成功转入您的账户";
		
	//add message history
	var History = AV.Object.extend(classnameModule.GetHistoryClass());
	var historyRecord = new History();
	historyRecord.set("type", PF_PUSH_MESSAGE_TYPE_TRANSFER);
	historyRecord.set("text", content);
	historyRecord.set("referenceId", payment.id);
	historyRecord.save().then(
		function (history){
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
							myPushMessage.set("sendTo", flight.get("owner"));
							myPushMessage.set("counter",1);
							myPushMessage.add("historyList",history);
							myPushMessage.set("lastShipping",shipping);
							myPushMessage.save();
						}
						else
						{
							var data = message[0].get("dataList");
							var shippingExist = false;
							if(data != null)
							{
								for(var i = 0; i<data.length; i++)
								{
								  if(data[i].id == shipping.id)
								  {
									shippingExist = true;
									break;
								  }
								}
							}
							if(!shippingExist)
							{
							  console.log("new shipping->"+shipping.id+" for Flight: "+flight.id);
							  message[0].add("dataList",shipping);
							}
							message[0].set("text", content);
							message[0].set("counter", message[0].get("counter")+1);
							message[0].set("status", PF_PUSH_MESSAGE_STATUS_SENT);
							message[0].set("lastShipping", shipping);
							message[0].add("historyList",history);
							message[0].set("lastShipping",shipping);
							message[0].save();
						}
					},function (error) {
							console.log(error.message);
			});
		},
	    function(error) {
		   console.log(error.message);
	   }
	 );

    var pushQuery = new AV.Query(AV.Installation);
    var flightUser = flight.get("owner");

    pushQuery.equalTo("user", flightUser);
    //pushQuery.equalTo("appIdentifier", messageModule.appName());

	if(flightUser != null && flightUser != "" && typeof flightUser !== 'undefined' )
	{
		AV.Push.send({
			where: pushQuery, // Set our Installation query
			data: {
				alert:content,
				body:content,
				objectId:flight.id,
				sound:'default',
				type:PF_PUSH_MESSAGE_TYPE_FLIGHT,
				action:PF_PUSH_MESSAGE_ACTION
			}
		}, {
			success: function () {
				// Push was successful
				console.log("PushPaymentTransferToSenderSucceedToFlightUser message: " + flightUser.id + " Cargo: " + cargo.id + " Flight: " + flight.id);
			},
			error: function (error) {
				// Handle error
				console.log(error.message);
			}
		});
	}
}

exports.PushPaymentTransferToSenderSucceedToCargoUser = function (payment,amount,shipping,user) {
    var PushMessage = AV.Object.extend(classnameModule.GetPushMessageClass());
    var myPushMessage = new PushMessage();
    
	var cargo = shipping.get("cargo");
	var flight = shipping.get("flight");
	
	flight.fetch({
    include: "owner"
	  },
	  {
		success: function(post) {
		    var content = "已经成功支付¥"+amount+"给顺带君"+flight.get("owner").get("fullname");
	
			//add message history
			var History = AV.Object.extend(classnameModule.GetHistoryClass());
			var historyRecord = new History();
			historyRecord.set("type", PF_PUSH_MESSAGE_TYPE_TRANSFER);
			historyRecord.set("text", content);
			historyRecord.set("referenceId", payment.id);
			historyRecord.save().then(
				function (history){
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
									myPushMessage.set("sendTo", cargo.get("owner"));
									myPushMessage.set("counter", 1);
									myPushMessage.add("historyList",history);
									myPushMessage.set("lastShipping",shipping);
									myPushMessage.save();
								}
								else{
									message[0].set("text", content);
									message[0].set("counter", message[0].get("counter")+1);
									message[0].set("status", PF_PUSH_MESSAGE_STATUS_SENT);
									message[0].add("historyList",history);
									message[0].set("lastShipping",shipping);
									message[0].save();
								}
							},function (error) {
									console.log(error.message);
					});
				},
				function(error) {
				   console.log(error.message);
			   }
			);
			
			    var pushQuery = new AV.Query(AV.Installation);
				var cargoUser = cargo.get("owner");

				pushQuery.equalTo("user", cargoUser);
				//pushQuery.equalTo("appIdentifier", messageModule.appName());
				if(cargoUser != null && cargoUser != "" && typeof cargoUser !== 'undefined' )
				{
					AV.Push.send({
						where: pushQuery, // Set our Installation query
						data: {
							alert:content,
							body:content,
							objectId:cargo.id,
							sound:'default',
							type:PF_PUSH_MESSAGE_TYPE_CHARGE,
							action:PF_PUSH_MESSAGE_ACTION
						}
					}, {
						success: function () {
							console.log("PushChargeShippingListSucceedToCargoUser message: Payment " + payment.id +" Cargo: " + cargo.id);
							// Push was successful
						},
						error: function (error) {
							// Handle error
							console.log(error.message);
						}
					});
				}
		}
	});
}

exports.PushPaymentRefundToCargotUser = function (payment,amount,shipping,user) {
    var PushMessage = AV.Object.extend(classnameModule.GetPushMessageClass());
    var myPushMessage = new PushMessage();
    
	var cargo = shipping.get("cargo");
	var flight = shipping.get("flight");
	
	flight.fetch({
    include: "owner"
	  },
	  {
		success: function(post) {
		    var content = "已经向顺带君"+flight.get("owner").get("fullname")+"申请退款¥"+amount;
	
			//add message history
			var History = AV.Object.extend(classnameModule.GetHistoryClass());
			var historyRecord = new History();
			historyRecord.set("type", PF_PUSH_MESSAGE_TYPE_REFUND);
			historyRecord.set("text", content);
			historyRecord.set("referenceId", payment.id);
			historyRecord.save().then(
				function (history){
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
									myPushMessage.set("sendTo", cargo.get("owner"));
									myPushMessage.set("counter", 1);
									myPushMessage.add("historyList",history);
									myPushMessage.set("lastShipping",shipping);
									myPushMessage.save();
								}
								else{
									message[0].set("text", content);
									message[0].set("counter", message[0].get("counter")+1);
									message[0].set("status", PF_PUSH_MESSAGE_STATUS_SENT);
									message[0].add("historyList",history);
									message[0].set("lastShipping",shipping);
									message[0].save();
								}
							},function (error) {
									console.log(error.message);
					});
				},
				function(error) {
				   console.log(error.message);
			   }
			);
			
			    var pushQuery = new AV.Query(AV.Installation);
				var cargoUser = cargo.get("owner");

				pushQuery.equalTo("user", cargoUser);
				//pushQuery.equalTo("appIdentifier", messageModule.appName());
				if(cargoUser != null && cargoUser != "" && typeof cargoUser !== 'undefined' )
				{
					AV.Push.send({
						where: pushQuery, // Set our Installation query
						data: {
							alert:content,
							body:content,
							objectId:cargo.id,
							sound:'default',
							type:PF_PUSH_MESSAGE_TYPE_CHARGE,
							action:PF_PUSH_MESSAGE_ACTION
						}
					}, {
						success: function () {
							console.log("PushChargeShippingListSucceedToCargoUser message: Payment " + payment.id +" Cargo: " + cargo.id);
							// Push was successful
						},
						error: function (error) {
							// Handle error
							console.log(error.message);
						}
					});
				}
		}
	});
}

exports.PushPaymentRefundToFlightUser = function (payment,amount,shipping,user) {
    var PushMessage = AV.Object.extend(classnameModule.GetPushMessageClass());
    var myPushMessage = new PushMessage();

    var cargo = shipping.get("cargo");
	var flight = shipping.get("flight");
	
    var content = "包裹"+cargo.get("type")+"的客户申请退款运费¥"+amount;
		
	//add message history
	var History = AV.Object.extend(classnameModule.GetHistoryClass());
	var historyRecord = new History();
	historyRecord.set("type", PF_PUSH_MESSAGE_TYPE_REFUND);
	historyRecord.set("text", content);
	historyRecord.set("referenceId", payment.id);
	historyRecord.save().then(
		function (history){
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
							myPushMessage.set("sendTo", flight.get("owner"));
							myPushMessage.set("counter",1);
							myPushMessage.add("historyList",history);
							myPushMessage.set("lastShipping",shipping);
							myPushMessage.save();
						}
						else
						{
							var data = message[0].get("dataList");
							var shippingExist = false;
							if(data != null)
							{
								for(var i = 0; i<data.length; i++)
								{
								  if(data[i].id == shipping.id)
								  {
									shippingExist = true;
									break;
								  }
								}
							}
							if(!shippingExist)
							{
							  console.log("new shipping->"+shipping.id+" for Flight: "+flight.id);
							  message[0].add("dataList",shipping);
							}
							message[0].set("text", content);
							message[0].set("counter", message[0].get("counter")+1);
							message[0].set("status", PF_PUSH_MESSAGE_STATUS_SENT);
							message[0].set("lastShipping", shipping);
							message[0].add("historyList",history);
							message[0].set("lastShipping",shipping);
							message[0].save();
						}
					},function (error) {
							console.log(error.message);
			});
		},
	    function(error) {
		   console.log(error.message);
	   }
	 );

    var pushQuery = new AV.Query(AV.Installation);
    var flightUser = flight.get("owner");

    pushQuery.equalTo("user", flightUser);
    //pushQuery.equalTo("appIdentifier", messageModule.appName());

	if(flightUser != null && flightUser != "" && typeof flightUser !== 'undefined' )
	{
		AV.Push.send({
			where: pushQuery, // Set our Installation query
			data: {
				alert:content,
				body:content,
				objectId:flight.id,
				sound:'default',
				type:PF_PUSH_MESSAGE_TYPE_FLIGHT,
				action:PF_PUSH_MESSAGE_ACTION
			}
		}, {
			success: function () {
				// Push was successful
				console.log("PushPaymentTransferToSenderSucceedToFlightUser message: " + flightUser.id + " Cargo: " + cargo.id + " Flight: " + flight.id);
			},
			error: function (error) {
				// Handle error
				console.log(error.message);
			}
		});
	}
}