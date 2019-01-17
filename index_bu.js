/*
MIT License

Copyright (c) 2017

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const result = require("dotenv").config();

if (result.error) {
    throw result.error;
}

var http = require("http");
var querystring = require("querystring");
var iotHub = require("azure-iothub");
var clientFromConnectionString = require('azure-iot-device-http').clientFromConnectionString;
var iotMessage = require("azure-iot-device").Message;
var async = require("async");

try {   
    main();
    return 0;
}
catch(e) {
    console.log(e.description);
}

function main() {

    var timeStamp = new Date().toISOString();
    var loginAuthorization;
    var startTime, endTime;
    //var outputLogs = (process.env.OutputLogs == true);
    var outputLogs = true;

    console.log("** OPERATION STARTED **");

    //if(myTimer.isPastDue)
    //{
    //    context.log('JavaScript is running late!');
    //}

    async.waterfall([
        function(mainCB) {
            login(function(authorization) {
                loginAuthorization = authorization;
                if (outputLogs) { console.log("#1 - Login - Complete"); }
                mainCB(null);
            });
        },
        function(mainCB) {
            getDevices(function(devices) {
                if (outputLogs) { console.log("#2 - Get Devices - ".concat(devices.length).concat(" identified - Complete")); }
                mainCB(null, devices);
            });
        },
        function(devices, mainCB) {
            async.eachSeries(devices, function(deviceId, deviceLoopCB) {
                startTime = addMinutes(new Date(), -10);
                endTime = new Date();

                async.waterfall([
                    function(deviceImportCB) {
                        getRobotStatus(authorization, deviceId, function(serialData, deviceImportCB) {
                            if (outputLogs) { console.log("#3 - Get Device Data for ".concat(deviceId).concat(" - Complete")); }
                            deviceImportCB(null, deviceId, serialData);
                        });
                    }
                ], function(err, result) {
                    if(err) { console.log("Exception1: " + err); }
                    deviceLoopCB(null);
                });

            }, function(err) {
                if(err) { console.log("Exception2: " + err); }
                mainCB(null);
            });
        }
    ], function (err, result) {
        if(err) { console.log("Exception3: " + err); }
        if (outputLogs) { console.log("** OPERATION COMPLETE **"); }
    });

    //context.done();

    return 0;

}

function getProcessVariable(name) {
    return process.env[name];
}

function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes*60000);
}

function getDeviceIoTHubConnectionString(deviceId, key) {
    var iotHubOwnerConnectionString = getProcessVariable("AzureIoTHubOwnerConnectionString");
    var hostName = iotHubOwnerConnectionString.split(";")[0].split("=")[1];
    return "HostName=".concat(hostName).concat(";DeviceId=").concat(deviceId).concat(";SharedAccessKey=").concat(key);
}

function pad(number) {
    if (number < 10) {
      return '0' + number;
    }
    return number;
  }


function login(callback) {

    // JRB - may or may not use login
    return "";

    var url = getProcessVariable("APIUrl");   
    var userName = getProcessVariable("APIUserName");
    var passWord = getProcessVariable("APIPassword");
    var setCookie;

    const postData = querystring.stringify({
        'UserName': userName,
        'Password': passWord
    });
      
    const options = {
        hostname: url,
        port: 80,
        path: '/api/account/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
    };
      
    const req = http.request(options, (res) => {
        res.setEncoding('utf8');

        res.on('data', (chunk) => {
            console.log(`BODY: ${chunk}`);
        });

        res.on('end', () => {
            //console.log('No more data in response.');
            setCookie = res.headers["set-cookie"][0];
            return callback(setCookie);
        });

    });
      
    req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });
    
    // write data to request body
    req.write(postData);
    req.end();

}

function getDevices() {
    return [
        {"deviceId":"robot1"}
    ];
}

function getRobotStatus(authorization, callback) {

    var url = getProcessVariable("APIUrl");
    var data = "";
      
    const options = {
        hostname: url,
        port: 80,
        path: '/status',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'authorization': "Basic ".concat(authorization)
        }
    };
      
    const req = http.request(options, (res) => {
        res.setEncoding('utf8');

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            return callback(JSON.parse(data));
        });

    });
      
    req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });
    
    // write data to request body
    req.end();

}

function batchDeviceDataUpload(deviceId, deviceInfo, deviceData, callback) {
    var deviceDataArray = deviceData.data;
    var client = clientFromConnectionString(getDeviceIoTHubConnectionString(deviceId, deviceInfo.authentication.symmetricKey.primaryKey));
    var messages = [];

    for (var i = 0; i < deviceDataArray.length; i++) {
        var deviceData = deviceDataArray[i];
        var messageData = JSON.stringify({ "deviceId": deviceId, deviceData });
        var message = new iotMessage(messageData);
        messages.push(message);
    };
    
    client.sendEventBatch(messages, function(err, result) {
        return callback(err, result);
    })

}

function registerDeviceWithIoTHub(deviceId, callback) {
    var iotHubConnectionString = getProcessVariable("AzureIoTHubOwnerConnectionString");
    var registry = iotHub.Registry.fromConnectionString(iotHubConnectionString);
    var device = {
        deviceId: deviceId
      };

    registry.create(device, function (err, deviceInfo, res) {
        if (err) {
            registry.get(device.deviceId, function registryGetHandler(err, deviceInfo, res) {
                if (deviceInfo) {
                    return callback(deviceInfo);
                }
                return callback(null);
            });
        }
        else { 
            return callback(deviceInfo);
        }
    });
}