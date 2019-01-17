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

        let responsePayload = await queryRobot(robots[i]);
        var client = clientFromConnectionString(getDeviceIoTHubConnectionString(deviceId, deviceInfo.authentication.symmetricKey.primaryKey));
    
        await client.sendEvent(responsePayload);
    }
}

// queryRobot - Responsible for query to robot
async function queryRobot(robot) {

    // Create Mir Robot authorization string
    const auth = await createAuthorization(robot.username, robot.password);

    // Loop through all robot methods in robotMethods.json
    for (let i = 0; i < robotMethods.length; i++) {
        await queryRobot(callRobotAPIMethod(robot, robotMethods[i]), auth);
    }
}

async function callRobotAPIMethod(robot, method, authorization) {

    const apiMethodOptions = {
        url: `https://${robot.ipaddress}/${method.url}`,
        method: method.httpverb,
        json: true,
        headers: { Authorization: `Basic ${authorization}` }
    };

    try {
        context.log(`Making ${method.name} call to robot ${robot.name} at ${robot.ipaddress}.`);
        return await request(apiMethodOptions);
    }
    catch (ex) {
        throw new Error("callRobotAPIMethod Error: ".concat(ex));
    }
}

// Mir Robot authorization is a SHA-256 hash in Base 64
async function createAuthorization(username, password) {

    const sha256 = crypto.createHash('sha256').update(username.concat(":").concat(password)).digest("hex");

    return Buffer.from(sha256).toString('base64');
}