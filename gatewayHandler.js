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

const request = require('request-promise-native');
const Client = require('azure-iot-device').Client;
const Protocol = require('azure-iot-device-amqp').AmqpWs;
const Message = require("azure-iot-device").Message;
const crypto = require('crypto');
const robots = require('./robots.json');
const robotMethods = require('./robotMethods.json');
const OutputLogs = (process.env.OutputLogs === 'true');

module.exports = async function () {

    const loopFrequency = parseInt(process.env.LoopFrequency);

    // Loop through all robots in robots.json
    while(true) {
        for (let robot of robots) {
            await queryRobot(robot);
            await delay(loopFrequency);
        }
    }
}

function delay(t, val) {
    return new Promise(function(resolve) {
        setTimeout(function() {
            resolve(val);
        }, t);
    });
 }

// queryRobot - Responsible for query to robot
async function queryRobot(robot) {

    let authorization;

    // Create Mir Robot authorization string
    try {
        authorization = createAuthorization(robot.username, robot.password);
    }
    catch(error)
    {
        console.log("Error creating authorization for Mir Robot: " + error.message)
    }

    // Create Azure IoT Hub Device Client
    const client = Client.fromConnectionString(robot.azureIoTHubDeviceConnectionString, Protocol);

    // Loop through all robot methods in robotMethods.json
    for (let i = 0; i < robotMethods.length; i++) {
        let methodPayload;
        try {
            methodPayload = await callRobotAPIMethod(robot, robotMethods[i], authorization);
        }
        catch(error) {
            throw new Error(error)
        }
        
        try {
            let message = new Message(JSON.stringify(methodPayload));
            await client.sendEvent(message);
            if (OutputLogs) console.log("Message sent to Azure IoT Hub");
        }
        catch(error) {
            console.log("Error sending event to IoT Hub: " + error.message)
        }
    }

    return;
}

async function callRobotAPIMethod(robot, method, authorization) {

    let payload;
    let url = new URL("http://" + robot.ipaddress + method.url);
    //let url = new URL("http://jsonplaceholder.typicode.com/posts")

    const apiMethodOptions = {
        url: url.href,
        method: method.httpverb,
        json: true,
        headers: { Authorization: `Basic ${authorization}` }
    };

    try {
        if (OutputLogs) console.log(`Making ${method.name} call to ${robot.name} at ${url}.`);
        payload = await request(apiMethodOptions);
        return payload;
    }
    catch (error) {
        console.log("Exception calling robot API method: " + error.Message);
    }

}

// Mir Robot authorization is a SHA-256 hash in Base 64
function createAuthorization(username, password) {

    const sha256 = crypto.createHash('sha256').update(username.concat(":").concat(password)).digest("hex");

    let authorization = Buffer.from(sha256).toString('base64');

    return authorization;
}