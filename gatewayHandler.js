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
const Device = require('azure-iot-device');
const DeviceTransport = require('azure-iot-device-http');
const clientFromConnectionString = require('azure-iot-device-http').clientFromConnectionString;
const iotMessage = require("azure-iot-device").Message;
const crypto = require('crypto');
const robots = require('./robots.json');
const robotMethods = require('./robotMethods.json');

module.exports = async function () {

    // Loop through all robots in robots.json
    for (let i = 0; i < robots.length; i++) {

        await queryRobot(robots[i]);

    }
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
        throw new Error(error);
    }

    var client = clientFromConnectionString(robot.azureIoTHubDeviceConnectionString);

    // Loop through all robot methods in robotMethods.json
    for (let i = 0; i < robotMethods.length; i++) {
        let methodPayload;
        try {
            let methodPayload = await callRobotAPIMethod(robot, robotMethods[i], authorization);
        }
        catch(error) {
            throw new Error(error)
        }

        console.log(`methodPayload: ${methodPayload}`);
        
        try {
            await client.sendEvent(methodPayload);
        }
        catch(error) {
            throw new Error(error)
        }
    }
}

async function callRobotAPIMethod(robot, method, authorization) {

    let payload;
    let url = new URL("http://" + robot.ipaddress + method.url);

    const apiMethodOptions = {
        url: url.href,
        method: method.httpverb,
        json: true,
        headers: { Authorization: `Basic ${authorization}` }
    };

    try {
        console.log(`Making ${method.name} call to ${robot.name} at ${url}.`);
        payload = await request(apiMethodOptions);
    }
    catch (error) {
        console.log("here");
        throw new Error (error);
    }

    return payload;
}

// Mir Robot authorization is a SHA-256 hash in Base 64
function createAuthorization(username, password) {

    const sha256 = crypto.createHash('sha256').update(username.concat(":").concat(password)).digest("hex");

    let authorization = Buffer.from(sha256).toString('base64');

    return authorization;
}

function GetEnvironmentVariable(name)
{
    return name + ": " + process.env[name];
}