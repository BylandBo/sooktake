//******Varibales Definition******//
var classnameModule = require('./classname');
var messageModule = require('./message');
var pushModule = require('./pushmessage');


var AV = require('leanengine');

// Include the Twilio Cloud Module and initialize it
var twilio = require("twilio")("AC05051a3183e935f8a6d2a2c94da971dd", "8668f086109349d554688600c3ff8e90");
//twilio.initialize("AC05051a3183e935f8a6d2a2c94da971dd","8668f086109349d554688600c3ff8e90");

var Flight = AV.Object.extend(classnameModule.GetFlightClass());
var Cargo = AV.Object.extend(classnameModule.GetCargoClass());
var Shipping = AV.Object.extend(classnameModule.GetShippingClass());
var PushMessage = AV.Object.extend(classnameModule.GetPushMessageClass());
var UserDetails = AV.Object.extend(classnameModule.GetUserDetailsClass());
var Config = AV.Object.extend(classnameModule.GetConfigClass());
/*
AssignCargoToFlight
Input:
1.cargo
2.weight
3.flight

Output:
succeed or error msg
*/
var succeedAssignCount = 0;
var AssignTotalWeight = 0;
AV.Cloud.define("AssignCargosToFlight", function (request, response) {
    var cargoIds = request.params.cargoList;
    var flightId = request.params.flight; 
    ValidationCargoAssignInfo(cargoIds, flightId, 'cargo', response);
});

var ValidationCargoAssignInfo = function (cargoIds, flightId, assignBy, response) {
    var flightQuery = new AV.Query(Flight);
	
	succeedAssignCount = 0;
	AssignTotalWeight = 0;
	succeedAssignCount = cargoIds.length;
    for(var i=0; i<cargoIds.length; i++)
	{
		var cargoQuery = new AV.Query(Cargo);
		cargoQuery.get(cargoIds[i]).then(
			  function(cargo) {
				if(cargo.get("status") != messageModule.CargoStatus_Pending())
				{
				    console.log("AssignCargosToFlight - Cargo:" +cargo.id + ", cargo status(wrong):"+cargo.get("status"));
				    if(cargo.get("status") == messageModule.CargoStatus_Processing())
					  response.error({code: 101, message: "重复调用，包裹已经分配过了"});
					else
					  response.error({code: 102, message: "状态不对"});
				}
				else
				{
					var lastestLeftWeight = cargo.get("leftWeight");
					AssignTotalWeight += lastestLeftWeight;
					console.log("AssignCargosToFlight - Cargo " +cargo.id + " weight: " + lastestLeftWeight);
					if (lastestLeftWeight === 0)
						response.error(messageModule.cargoProcessing());

					flightQuery.get(flightId).then(
						function(flight) {
							var lastestLeftSpace = flight.get("leftSpace");
							if (lastestLeftSpace === 0 || lastestLeftSpace < lastestLeftWeight)
								response.error(messageModule.errorMsg());
							console.log("Flight " + flightId + " space: " + lastestLeftSpace);
							//all valid, then start to update
							UpdateFlightInfo(cargo.id, flightId, lastestLeftWeight, assignBy, response);
						}, function (error){
							console.log(error.message);
							response.error(messageModule.errorMsg());
						});
				}
			}, function (error){
						console.log(error.message);
						//response.error(messageModule.errorMsg());
			});
	}
};

var UpdateFlightInfo = function (cargoId, flightId, weight, assignBy, response) {
    var flightQuery = new AV.Query(Flight);

    flightQuery.get(flightId).then(function (flight){
			var lastestLeftSpace = flight.get("leftSpace");
            if (lastestLeftSpace == 0 || lastestLeftSpace < weight)
                response.error(messageModule.errorMsg());
			UpdateCargoInfo(cargoId, flightId, weight, assignBy, response);
			
			}, function(error) {
				console.log(error.message);
				response.error(messagemodule.errormsg());
			});
};

var UpdateCargoInfo = function (cargoId, flightId,weight, assignBy, response) {
    var cargoQuery = new AV.Query(Cargo);

    cargoQuery.get(cargoId).then(function(cargo){
		var lastestLeftWeight = cargo.get("leftWeight");
			console.log("Update Cargo Before: "+ cargo.id + " Weight: "+ lastestLeftWeight);
            if(lastestLeftWeight == 0)
                response.error(messageModule.cargoProcessing());
            else if(lastestLeftWeight < weight)
                response.error(messageModule.cargoWeightNotEnough());
            cargo.set("leftWeight", lastestLeftWeight - weight);
            if (lastestLeftWeight - weight == 0)
                cargo.set("status", messageModule.CargoStatus_Processing());
			cargo.save(null).then(
			  function(result) {
				console.log("Update Cargo After: "+ result.id + " Weight: "+ result.get("leftWeight"));
				//then update the shipping info
				CreateShippingInfo(cargoId, flightId, weight, assignBy, response);
			  },
			  function(error) {
				console.log(error.message);
			  });	
		},function (error) {
            console.log(error.message);
            response.error(messageModule.errorMsg());
       });
};


var CreateShippingInfo = function (cargoId, flightId, weight, assignBy, response) {
    var flightQuery = new AV.Query(Flight);
    var cargoQuery = new AV.Query(Cargo);
	
    var myShipping = new Shipping();

	console.log("Create Cargo-Flight Shipping-> Weight:"+weight);
    flightQuery.get(flightId, {
        success: function (flight) {
            cargoQuery.get(cargoId, {
                success: function (cargo) {
                    myShipping.set("status", messageModule.ShippingStatus_Pending());
                    myShipping.set("isSending", false);
                    myShipping.set("isReceived", false);
                    myShipping.set("cargo", cargo);
                    myShipping.set("flight", flight);
                    myShipping.set("weight", parseInt(weight));
					myShipping.set("sender",flight.get("owner"));//AV.User.current()
					myShipping.set("assignBy",assignBy);
                    myShipping.save(null).then(
					  function(result) {
						console.log("Create Cargo-Flight Shipping-> Cargo: "+ cargo.id + " flight: "+ flight.id + " Weight: " + result.get("weight"));
						succeedAssignCount--;
						//push message to cargo owner and flight
						pushModule.PushCargoAssigned(cargo, flight,myShipping);
						pushModule.PushFlightAssigned(cargo, flight,myShipping);
						
						if(succeedAssignCount == 0)
						{
						    var lastestFlightLeftSpace = flight.get("leftSpace");
							flight.set("leftSpace", lastestFlightLeftSpace - AssignTotalWeight);
							if(lastestFlightLeftSpace - AssignTotalWeight <= 0)
								flight.set("status", messageModule.FlightStatus_Full());
							flight.save(null).then(
							  function(result) {
								console.log("Update Flight After: lastestFlightLeftSpace "+ result.get("leftSpace"));
								response.success(messageModule.succeedMsg());
							  },
							  function(error) {
								console.log(error.message);
								response.error(messageModule.errorMsg());
							  });
						}
					  },
					  function(error) {
						console.log(error.message);
					  });
                },
                error: function (error) {
                    console.log(error.message);
                    response.error(messageModule.errorMsg());
                }
            });
        },
        error: function () {
            console.log(error.message);
            response.error(messageModule.errorMsg());
        }
    });
};


AV.Cloud.define("CancelShipping", function(request, response) {
    var shippingQuery = new AV.Query(Shipping);
	
    var shippingId = request.params.shipping; 
	var reasonCode = request.params.reasonCode;
	var reason = request.params.reason;	
	var isCancelByCargoOwner = request.params.isCancelByCargoOwner;
	
	if(isCancelByCargoOwner == null || isCancelByCargoOwner == '')
	   isCancelByCargoOwner = 'NO';
	shippingQuery.include("cargo");
	shippingQuery.include("flight");
    shippingQuery.get(shippingId, {
        success: function (shipping) {
            // The object was retrieved successfully.
			if(shipping.get("status") != messageModule.ShippingStatus_Pending())
			{
			  response.error({code: 102, message: "状态不对"});
			}
			else if(shipping.get("status") == messageModule.ShippingStatus_Cancel())
			{
			  response.error({code: 101, message: "重复调用，包裹已经取消分配过了"});
			}
			else
			{
				var flight = shipping.get("flight");
				var cargo = shipping.get("cargo");
				console.log("CancelShipping - Flight:" + flight.id +" Cargo:"+cargo.id);
				var addSpace = shipping.get("weight");
				
				 flight.set("leftSpace",flight.get("leftSpace") + addSpace);
				 if(flight.get("status") == messageModule.FlightStatus_Full())
					flight.set("status",messageModule.FlightStatus_Pending());
				 flight.remove("shippingList",shipping);
				 flight.save().then(function(f){
						cargo.set("status",messageModule.CargoStatus_Pending());
						cargo.set("leftWeight",cargo.get("leftWeight") + addSpace);
						cargo.set("shipping",null);
						cargo.save().then(function(result){
							//shipping.set("flight",null);
							//shipping.set("cargo",null);
							shipping.set("status",messageModule.ShippingStatus_Cancel());
							shipping.set("isCancelByCargoOwner",isCancelByCargoOwner);
							shipping.save().then(function(s){
								pushModule.PushShippingCancelToUser(result,reasonCode);
								pushModule.PushShippingCancelToFlightUser(result,flight,reasonCode);
								response.success(s);
							},function (error) {
								console.log(error.message);
								response.error(messageModule.errorMsg());
							});
						});
					},function (error) {
					console.log(error.message);
					response.error(messageModule.errorMsg());
				});
			}
        },
        error: function (error) {
            // The object was not retrieved successfully.
            console.log(error.message);
            response.error(messageModule.errorMsg());
        }
    });
});

/*
UpdateShippingStatus
Input:
1.shipping
2.status

Output:
succeed or error msg
*/
AV.Cloud.define("UpdateShippingStatus", function (request, response) {
    var shippingQuery = new AV.Query(Shipping);
    var shippingId = request.params.shipping;
    var status = request.params.status;
	shippingQuery.include("cargo");
	shippingQuery.include("flight");
	var flightNotReady = false;
	
	console.log("UpdateShippingStatus-> shippingId:" + shippingId + ", status:"+status);
    shippingQuery.get(shippingId, {
        success: function (shipping) {
            // The object was retrieved successfully.
			var isValidStatus = 0;
			if(status == messageModule.ShippingStatus_Sending())
			{
			 shipping.set("sendingTime",new Date());
			 if(shipping.get("status") != messageModule.ShippingStatus_Pending())
			  isValidStatus = 2;
			 if(shipping.get("status") == messageModule.ShippingStatus_Sending())
			  isValidStatus = 1;
			}
			if(status == messageModule.ShippingStatus_Received())
			{
				shipping.set("receivedTime",new Date());
			    var flight = shipping.get("flight");
				if(flight != null)
				{
				  if(status == messageModule.ShippingStatus_Received() && flight.get("time") > new Date())
				  {
					console.log("Flight "+ flight.id + " not take off yet.");
					flightNotReady = true;
				  }
				}
		      
			  if(shipping.get("status") != messageModule.ShippingStatus_Sending())
			   isValidStatus = 2;
			  if(shipping.get("status") == messageModule.ShippingStatus_Received())
			   isValidStatus = 1;
			}
			shipping.set("status",status);
			if(isValidStatus != 0)
			{
			   console.log("UpdateShippingStatus-> shippingId:"+ shippingId + ", invalid status check: " + isValidStatus);
			   if(isValidStatus == 1)
			     response.error({code: 101, message: "重复调用，包裹已经拿到/寄出了"});
			   else 
			     response.error({code: 102, message: "状态不对"});
			}
			else if(flightNotReady)
			{
			   response.error({code: 406, message: 'flight not take off yet'});
			}
			else
			{
				shipping.save().then(function(result){
					CheckUpdateCargoAndFlight(result,response);
					pushModule.PushShippingStatusUpdateToUser(result);
					pushModule.PushShippingStatusUpdateToFlighter(result);
				},function (error) {
					console.log(error.message);
					response.error(messageModule.errorMsg());
				});
			}
        },
        error: function (error) {
            // The object was not retrieved successfully.
            console.log(error.message);
            response.error(messageModule.errorMsg());
        }
    });
});

/*
CheckUpdateCargoAndFlight
Input:
1.shipping

Output:
succeed or error msg
*/
var CheckUpdateCargoAndFlight = function (shipping, response) {
	var cargo = shipping.get("cargo");
	
    var shippingQuery = new AV.Query(Shipping);
	
	shippingQuery.equalTo("cargo", cargo);
	//shippingQuery.equalTo("status", messageModule.ShippingStatus_Received());
    shippingQuery.find({
        success: function (shippings) {
			var sumWeight = 0;
			for (var i = 0; i < shippings.length; ++i) {
			  if(shippings[i].get("status") == messageModule.ShippingStatus_Received())
				sumWeight += shippings[i].get("weight");
			}
			console.log("Sum weight: " + sumWeight +", Cargo: " + cargo.get("weight") );
			if(sumWeight >= parseInt(cargo.get("weight")))
			{
				cargo.set("status",messageModule.CargoStatus_Completed());
			}
			else if(shipping.get("status") == messageModule.ShippingStatus_Received())
			{				
				 cargo.set("status",messageModule.CargoStatus_Received());
			}
			else if(shipping.get("status") == messageModule.ShippingStatus_Sending())
			{				
				 cargo.set("status",messageModule.CargoStatus_Sending());
			}
			cargo.save().then(function(result){
				CheckUpdateFlight(shipping, response);
			},function (error) {
				console.log(error.message);
				response.error(messageModule.errorMsg());
			});
        },
        error: function (error) {
            // The object was not retrieved successfully.
            console.log(error.message);
            response.error(messageModule.errorMsg());
        }
    });
};

/*
CheckUpdateFlight
Input:
1.shipping

Output:
succeed or error msg
*/
var CheckUpdateFlight = function (shipping, response) {
    var flight = shipping.get("flight");
	
    var shippingQuery = new AV.Query(Shipping);
	
	shippingQuery.equalTo("flight", flight);
	shippingQuery.equalTo("status", messageModule.ShippingStatus_Received());
    shippingQuery.find({
        success: function (shippings) {
			var sumWeight = 0;
			for (var i = 0; i < shippings.length; ++i) {
			  sumWeight += shippings[i].get("weight");
			}
			console.log("sumWeight: " + sumWeight +"; space: "+flight.get("space"));
			if(sumWeight >= parseInt(flight.get("space")))
			{
				flight.set("status",messageModule.FlightStatus_Completed())
				flight.save().then(function(result){
					response.success(messageModule.succeedMsg());
				},function (error) {
					console.log(error.message);
					response.error(messageModule.errorMsg());
				});
			}
			else
				response.success(messageModule.succeedMsg());
        },
        error: function ( error) {
            // The object was not retrieved successfully.
            console.log(error.message);
            response.error(messageModule.errorMsg());
        }
    });
};


/*
ApproveShuikeRegistration   
Input:userdetailId, isApprove, reason

Output:
*/
AV.Cloud.define("ApproveShuikeRegistration", function (request, response) {
    var userDetailQuery = new AV.Query(classnameModule.GetUserDetailsClass());
    var userdetailId = request.params.userdetailId;
    var isApprove = request.params.isApprove;
    var reason = request.params.reason;
	var expiryDate = request.params.expiryDate;
    
    userDetailQuery.equalTo("objectId", userdetailId);
    userDetailQuery.include("owner");
	AV.Cloud.useMasterKey();
    userDetailQuery.find().then(function (userDetails) {
		var userDetail = userDetails[0];
		var currentUser = userDetail.get("owner");
        // At this time myUser is filled with an Object containing type _pointer, objectid, etc.
		userDetail.set("expiryDate",expiryDate);
        if (isApprove == '1'){
            userDetail.set("status", messageModule.PF_USERDETAILS_STATUS_APPROVED());
			currentUser.set("isVerify",messageModule.YES());
		}
        else if(isApprove == '2') {
            userDetail.set("status", messageModule.PF_USERDETAILS_STATUS_REJECTED());
            userDetail.set("reject_msg", reason);
        }
		else
		{
            userDetail.set("status", messageModule.PF_USERDETAILS_STATUS_CANCELED());
            userDetail.set("reject_msg", reason);
        }
		console.log("Save user now: " + currentUser.id + "; Status: "+ currentUser.get("isVerify") + "; detail: "+ userDetail.get("status"));
        userDetail.save(null).then(function (updatedUser){
			console.log("Save user succeed.");
			//sms to user
			var message = '';
			if (userDetail.get("status") == messageModule.PF_USERDETAILS_STATUS_APPROVED())
				 message = "恭喜您通过了soontake的实名认证，请重新登录,赶快上传行程赚点路费吧.";
			else if (userDetail.get("status") == messageModule.PF_USERDETAILS_STATUS_REJECTED())
				message = "您目前未通过soontake实名认证，原因'" + userDetail.get("reject_msg") + "',我们期待您完善资料.";
			
			if(userDetail.get("status") != messageModule.PF_USERDETAILS_STATUS_CANCELLED())
			{
				SMSInformation("+"+currentUser.get("username"),message);			
				//push message to user
				pushModule.PushUserDetailVerifyStatus(userDetail);
			}
			response.success(messageModule.succeedMsg());
		});
		}, function (error) {
			// The object was not retrieved successfully.
			console.log(error.message);
			response.error(messageModule.errorMsg());
		});
})

AV.Cloud.define("UpdateShuikeUser", function (request, response) {
	var userDetailQuery = new AV.Query(classnameModule.GetUserDetailsClass());
    var userdetailId = request.params.userdetailId;
	var expiryDate = request.params.expiryDate;
    
    userDetailQuery.equalTo("objectId", userdetailId);
	AV.Cloud.useMasterKey();
    userDetailQuery.find().then(function (userDetails) {
		var userDetail = userDetails[0];
		userDetail.set("expiryDate",expiryDate);
        
        userDetail.save(null).then(function (updatedUser){
			console.log("Save user succeed.");
			response.success(messageModule.succeedMsg());
		});
		}, function (error) {
			// The object was not retrieved successfully.
			console.log(error.message);
			response.error(messageModule.errorMsg());
		});
})


// Create the Cloud Function
AV.Cloud.define("SMSwithTwilio", function(request, response) {
  // Use the Twilio Cloud Module to send an SMS
  var phoneNumber = request.phoneNumber; 
  var content = request.content; 
  SMSInformation(phoneNumber, content);
});

var SMSInformation = function (phoneNumber, content){
  console.log("SMS to " + phoneNumber + ", content: "+ content);
  twilio.messages.create({
    From: "+18446126401",
    To: phoneNumber,
    Body: '【SoonTake客服】'+content
  }, {
    success: function(httpResponse) { console.log("SMS to " + phoneNumber + " succeed")},
    error: function(httpResponse) { console.log("SMS to " + phoneNumber + " failed")}
  });
}

/*
ResetUserPassword  
Input:userId

Output:
true/false
*/
AV.Cloud.define("ResetUserPassword", function (request, response) {
    var phoneNumber = request.params.phoneNumber;
	var password = request.params.password;
	var userQuery = new AV.Query(AV.User);
  
    userQuery.equalTo("username", phoneNumber);
	AV.Cloud.useMasterKey();
	
    userQuery.find().then(function (user) {
	    if(user.length <= 0)
		{
			console.log("Reset password -> failed: user->"+phoneNumber +" cannot be found, return code:" +'141');
			//response.error('141');
			response.error({code: 141, message: 'user cannot be found'});
		}
		else
		{
			user[0].set("password", password);
			user[0].save().then(function(result){
			   response.success(result);
			},function (error) {
				console.log(error.message);
				response.error(messageModule.errorMsg());
			});
		}
	},function (error) {
            console.log(error.message);
            response.error(messageModule.errorMsg());
    });
})

/*
StartNewConversition  
Input:userId

Output:
true/false
*/
AV.Cloud.define("StartNewConversition", function (request, response) {
    var sendTo = request.params.sendTo;
	var sendFrom = request.params.sendFrom;
	var conversitionId = request.params.conversitionId;
	var groupId = request.params.groupId;
	var userSendToQuery = new AV.Query(AV.User);
	var userSendFromQuery = new AV.Query(AV.User);
	
    var myPushMessage = new PushMessage();
  
    userSendToQuery.equalTo("objectId", sendTo);
	userSendFromQuery.equalTo("objectId", sendFrom);
	AV.Cloud.useMasterKey();
	
	console.log("StartNewConversition-> From user:" + sendFrom + " To user:"+sendTo);

	userSendToQuery.find().then(function (user) {
			if(user.length <= 0)
				response.error(messageModule.UserNotFound());
			else
			{
				var messageRelation = user[0].relation('existMessages');
			}
			
			userSendFromQuery.find().then(function (userF) {
			if(userF.length <= 0)
				response.error(messageModule.UserNotFound());
			else
			{
			    myPushMessage.set("groupId", groupId);
				myPushMessage.add("dataList",conversitionId);
				myPushMessage.set("text", "");
				myPushMessage.set("status", "new");
				myPushMessage.set("type", "chat");
				myPushMessage.set("sendFrom", userF[0]);
				myPushMessage.set("sendTo", user[0]);
				console.log("StartNewConversition-> conversitionId:" + conversitionId + " groupId:" + groupId);
				myPushMessage.save(null, {
				  success: function(message) {
					messageRelation.add(message);
					user[0].save();
					
					var messageFRelation = userF[0].relation('existMessages');
					messageFRelation.add(message);
					userF[0].save();
					
					response.success(message);
				  },
				  error: function(message, error) {
					console.log(error.message);
					response.error(messageModule.errorMsg());
				  }
				});
			}
			},function (error) {
					console.log(error.message);
					response.error(messageModule.errorMsg());
			});
	  });
})

/*
GetShuikeRegistrationList  
Input:cargo

Output:
user list
*/
AV.Cloud.define("GetShuikeRegistrationList", function (request, response) {
    var userDetailsQuery = new AV.Query(UserDetails);
    var status = request.params.status;

	console.log("GetShuikeRegistrationList-> status:" + status);
    userDetailsQuery.include("owner");
    userDetailsQuery.equalTo("status", status);
	
    userDetailsQuery.find().then(function(results){
			   response.success(results);
			},function (error) {
				console.log(error.message);
				response.error(messageModule.errorMsg());
			});
});

AV.Cloud.define("GetShuikeUserExpiryList", function (request, response) {
    var userDetailsQuery = new AV.Query(UserDetails);
	var userDetailsQuery2 = new AV.Query(UserDetails);

	console.log("GetShuikeUserExpiryList");
    userDetailsQuery.lessThan("expiryDate", new Date());
	
    userDetailsQuery2.equalTo('expiryDate', '');
	userDetailsQuery2.include("owner");

    //var query = AV.Query.or(userDetailsQuery, userDetailsQuery2);
    //query.include("owner");
	
    userDetailsQuery2.find().then(function(results){
			   response.success(results);
			},function (error) {
				console.log(error.message);
				response.error(messageModule.errorMsg());
			});
});


AV.Cloud.define("CheckUpdateFlightJob", function(request, response) {
  var flightQuery = new AV.Query(Flight);
	
  flightQuery.lessThan("time", new Date());
  flightQuery.notContainedIn("status",[messageModule.FlightStatus_Completed(), messageModule.FlightStatus_Full(), messageModule.FlightStatus_Overdue()]);
	
  console.log("Update overdue Flights....");
  flightQuery.each(function(flight) {
      // Set and save the change
	  console.log("Update overdue Flight: "+flight.id);
      flight.set("status", messageModule.FlightStatus_Overdue());
      flight.save().then(function(result){
	     if(result.shippingList != null)
		 {
			 for(var i=0; i<result.shippingList.length;i++)
			 {
				var cargo = result.shippingList[i].get("cargo");
				if(cargo.get("status") == messageModule.CargoStatus_Pending())
				 {
					cargo.set("status",messageModule.CargoStatus_Cancel());
					cargo.save();
				 }
			 }
		 }
		 //response.success(true);
	  });
  }).then(function() {
    // Set the job's success status
	console.log("Flight Update completed successfully");
	response.success(true);
  }, function(error) {
    // Set the job's error status
	console.log(error.message);
	response.error(false);
  });
  
});

AV.Cloud.define("GetLatestAppVersion", function(request, response) {
    var returnResults ={};
	var currentVersion = request.params.currentVersion;
	var platform = request.params.platform;
    var configQuery = new AV.Query(Config);
	var configQuery2 = new AV.Query(Config);
	var currentUserId = null;
	if(AV.User.current()!=null)
		currentUserId = AV.User.current().id;
	console.log("Get latest version: current version->"+currentVersion+ "; platform->"+platform+"; currentUser->"+currentUserId);
	if(platform.toLowerCase() == 'ios')
	{
	    console.log("Check ios version");
		configQuery.equalTo("key", "latestIOSAppVersion");
		configQuery2.equalTo("key", "supportIOSAppVersion");
	}
	else
	{
		console.log("Check android version");
		configQuery.equalTo("key", "latestAndroidAppVersion");
		configQuery2.equalTo("key", "supportAndroidAppVersion");
	}
    configQuery.find().then(function (config) {
	    if(config.length <= 0)
			response.error(messageModule.ConfigNotFound());
		else
		{
		    configQuery2.find().then(function (config2) {
				var lowestVersion = parseFloat(config2[0].get("value"));
											
				var newversion = parseFloat(config[0].get("value"));
				var oldversion = parseFloat(currentVersion);
				returnResults["latestVersion"] = config[0].get("value");
				
				if(oldversion < lowestVersion)
				{
					console.log("Get latest version: current version->"+oldversion+ "; latestVersion->"+newversion + ";lowestVersion->"+lowestVersion+" ; needUpdate->Yes");
					//then return the download url
					returnResults["isMustUpdate"] = "YES";
					if(platform.toLowerCase() == 'ios')
						configQuery.equalTo("key", "appleStoreDownloadURL");
					else
						configQuery.equalTo("key", "androidStoreDownloadURL");
					configQuery.find().then(function (config) {
						returnResults["downloadURL"] = config[0].get("value")
				 });
				}
				else if(newversion > oldversion)
				{
				   console.log("Get latest version: current version->"+oldversion+ "; latestVersion->"+newversion + ";lowestVersion->"+lowestVersion+" ; needUpdate->NO");
				   returnResults["isMustUpdate"] = "NO";
					if(platform.toLowerCase() == 'ios')
						configQuery.equalTo("key", "appleStoreDownloadURL");
					else
						configQuery.equalTo("key", "androidStoreDownloadURL");
					configQuery.find().then(function (config) {
						returnResults["downloadURL"] = config[0].get("value")
				   });
				}
				else
				{
				  console.log("Get latest version: current version->"+oldversion+ "; latestVersion->"+newversion + ";lowestVersion->"+lowestVersion+" ; needUpdate->NO");
				  returnResults["isMustUpdate"] = "NO";
				}
				response.success(returnResults);
			}, function (error){
				console.log(error.message);
				response.error(messageModule.errorMsg());
			});
		}
	},function (error) {
            console.log(error.message);
            response.error(messageModule.errorMsg());
    });
});

AV.Cloud.define("SearchCargoInfo", function(request, response) {
	var orderId = request.params.cargoId;
    var cargoQuery = new AV.Query(Cargo);
	var cargoQuery2 = new AV.Query(Cargo);

	console.log("SearchCargoInfo: orderId->" + orderId);
	cargoQuery.equalTo("orderId", orderId);
	cargoQuery.find().then(
		function(cargos) {
		         if(cargos.length <= 0)
				 {
					console.log("SearchCargoInfo: shunfengId->" + orderId);
					cargoQuery2.equalTo("shunfengId", orderId);
					cargoQuery2.find().then(
					function(subcargos) {
								response.success(subcargos[0]);
						}, function (error){
									console.log(error.message);
									response.error(messageModule.errorMsg());
						});
				 }
				 else
					response.success(cargos[0]);
			}, function (error){
						console.log(error.message);
						response.error(messageModule.errorMsg());
			});
});

AV.Cloud.define("AssignFlightToCargo", function (request, response) {
    var cargoId = request.params.cargo;
    var flightId = request.params.flight; 
	
	var cargoIds = [];
	cargoIds.push(cargoId);
    ValidationCargoAssignInfo(cargoIds, flightId, 'flight', response);
});


