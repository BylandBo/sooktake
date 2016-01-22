//******Varibales Definition******//
var classnameModule = require('./classname');
var messageModule = require('./message');
var messageModule = require('./message');
var pushModule = require('./pushmessage');

var AV = require('leanengine');

//******Functions Definition******//

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
    ValidationCargoAssignInfo(cargoIds, flightId, response);
});

var ValidationCargoAssignInfo = function (cargoIds, flightId, response) {
    var Flight = AV.Object.extend(classnameModule.GetFlightClass());
    var flightQuery = new AV.Query(Flight);

    var Cargo = AV.Object.extend(classnameModule.GetCargoClass());
	succeedAssignCount = 0;
	AssignTotalWeight = 0;
	succeedAssignCount = cargoIds.length;
    for(var i=0; i<cargoIds.length; i++)
	{
		var cargoQuery = new AV.Query(Cargo);
		cargoQuery.get(cargoIds[i]).then(
			  function(cargo) {
				var lastestLeftWeight = cargo.get("leftWeight");
				AssignTotalWeight += lastestLeftWeight;
				console.log("Cargo " +cargo.id + " weight: " + lastestLeftWeight);
				if (lastestLeftWeight === 0)
					response.error(messageModule.cargoProcessing());

				flightQuery.get(flightId).then(
					function(flight) {
						var lastestLeftSpace = flight.get("leftSpace");
						if (lastestLeftSpace === 0 || lastestLeftSpace < lastestLeftWeight)
							response.error(messageModule.errorMsg());
						console.log("Flight " + flightId + " space: " + lastestLeftSpace);
						//all valid, then start to update
						UpdateFlightInfo(cargo.id, flightId, lastestLeftWeight, response);
					}, function (error){
						console.log(error.message);
						response.error(messageModule.errorMsg());
					});
			}, function (error){
						console.log(error.message);
						//response.error(messageModule.errorMsg());
			});
	}
};

var UpdateFlightInfo = function (cargoId, flightId, weight, response) {
    var Flight = AV.Object.extend(classnameModule.GetFlightClass());
    var flightQuery = new AV.Query(Flight);

    flightQuery.get(flightId).then(function (flight){
			var lastestLeftSpace = flight.get("leftSpace");
            if (lastestLeftSpace == 0 || lastestLeftSpace < weight)
                response.error(messageModule.errorMsg());
			UpdateCargoInfo(cargoId, flightId, weight, response);
			
			}, function(error) {
				console.log(error.message);
				response.error(messagemodule.errormsg());
			});
};

var UpdateCargoInfo = function (cargoId, flightId,weight, response) {
    var Cargo = AV.Object.extend(classnameModule.GetCargoClass());
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
				CreateShippingInfo(cargoId, flightId, weight, response);
			  },
			  function(error) {
				console.log(error.message);
			  });	
		},function (error) {
            console.log(error.message);
            response.error(messageModule.errorMsg());
       });
};


var CreateShippingInfo = function (cargoId, flightId, weight, response) {
    var Flight = AV.Object.extend(classnameModule.GetFlightClass());
    var flightQuery = new AV.Query(Flight);

    var Cargo = AV.Object.extend(classnameModule.GetCargoClass());
    var cargoQuery = new AV.Query(Cargo);

    var Shipping = AV.Object.extend(classnameModule.GetShippingClass());
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
					myShipping.set("sender",AV.User.current())
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
	var Shipping = AV.Object.extend(classnameModule.GetShippingClass());
    var shippingQuery = new AV.Query(Shipping);
	
    var shippingId = request.params.shipping; 
	var reasonCode = request.params.reasonCode;
	var reason = request.params.reason;	
	
	shippingQuery.include("cargo");
	shippingQuery.include("flight");
    shippingQuery.get(shippingId, {
        success: function (shipping) {
            // The object was retrieved successfully.
			var flight = shipping.get("flight");
			var cargo = shipping.get("cargo");
			console.log("Flight:" + flight.id +" Cargo:"+cargo.id);
			var addSpace = shipping.get("weight");
			
			 flight.set("leftSpace",flight.get("leftSpace") + addSpace);
			 flight.remove("shippingList",shipping);
			 flight.save().then(function(f){
				    cargo.set("status",messageModule.CargoStatus_Pending());
					cargo.set("leftWeight",cargo.get("leftWeight") + addSpace);
					cargo.set("shipping",null);
					cargo.save().then(function(result){
						pushModule.PushShippingCancelToUser(result,reasonCode);
						//shipping.set("flight",null);
						//shipping.set("cargo",null);
						shipping.set("status",messageModule.ShippingStatus_Cancel());
						
						shipping.save().then(function(s){
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
        },
        error: function (error) {
            // The object was not retrieved successfully.
            console.log(error.message);
            response.error(messageModule.errorMsg());
        }
    });
});

AV.Cloud.define("GetLatestAppVersion", function(request, response) {
    var returnResults ={};
	var currentVersion = request.params.currentVersion;
	var Config = AV.Object.extend(classnameModule.GetConfigClass());
    var configQuery = new AV.Query(Config);
	configQuery.equalTo("type", "latestAppVersion");
    configQuery.find().then(function (config) {
	    if(config.length <= 0)
			response.error(messageModule.ConfigNotFound());
		else
		{
			returnResults["latestVersion"] = config[0].get("value");
			if(currentVersion != config[0].get("value"))
				returnResults["isMustUpdate"] = "YES";
			else
				returnResults["isMustUpdate"] = "NO";
			response.success(returnResults);
		}
	},function (error) {
            console.log(error.message);
            response.error(messageModule.errorMsg());
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
    var Shipping = AV.Object.extend(classnameModule.GetShippingClass());
    var shippingQuery = new AV.Query(Shipping);
    var shippingId = request.params.shipping;
    var status = request.params.status;
	shippingQuery.include("cargo");
	shippingQuery.include("flight");
	
	console.log("UpdateShippingStatus-> shippingId:" + shippingId + ", status:"+status);
    shippingQuery.get(shippingId, {
        success: function (shipping) {
            // The object was retrieved successfully.
            shipping.set("status",status);
			if(status == messageModule.ShippingStatus_Sending())
			 shipping.set("sendingTime",new Date());
			if(status == messageModule.ShippingStatus_Received())
			 shipping.set("receivedTime",new Date());
            shipping.save().then(function(result){
				CheckUpdateCargoAndFlight(result,response);
			    pushModule.PushShippingStatusUpdateToUser(result);
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
	
	var Shipping = AV.Object.extend(classnameModule.GetShippingClass());
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
	
	var Shipping = AV.Object.extend(classnameModule.GetShippingClass());
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
    
    userDetailQuery.equalTo("objectId", userdetailId);
    userDetailQuery.include("owner");
	AV.Cloud.useMasterKey();
    userDetailQuery.find().then(function (userDetails) {
		var userDetail = userDetails[0];
		var currentUser = userDetail.get("owner");
        // At this time myUser is filled with an Object containing type _pointer, objectid, etc.
        if (isApprove == 'true'){
            userDetail.set("status", messageModule.PF_USERDETAILS_STATUS_APPROVED());
			currentUser.set("isVerify",messageModule.YES());
		}
        else {
            userDetail.set("status", messageModule.PF_USERDETAILS_STATUS_REJECTED());
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
		    SMSInformation("+"+currentUser.get("username"),message);
			
			//push message to user
			pushModule.PushUserDetailVerifyStatus(userDetail);
			response.success(messageModule.succeedMsg());
		});
		}, function (error) {
			// The object was not retrieved successfully.
			console.log(error.message);
			response.error(messageModule.errorMsg());
		});
})

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
			response.error(messageModule.UserNotFound());
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
	
	var PushMessage = AV.Object.extend(classnameModule.GetPushMessageClass());
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
				myPushMessage.set("status", "sent");
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
    var UserDetails = AV.Object.extend(classnameModule.GetUserDetailsClass());
    var userDetailsQuery = new AV.Query(UserDetails);
    var status = request.params.status;

	console.log("GetShuikeRegistrationList-> status: " + status);
    userDetailsQuery.include("owner");
    userDetailsQuery.equalTo("status", status);
    userDetailsQuery.find({
        success: function (userDetails) {
            // The object was retrieved successfully.
            response.success(userDetails);
        },
        error: function ( error) {
            // The object was not retrieved successfully.
            console.log(error.message);
            response.error(messageModule.errorMsg());
        }
    });
})
