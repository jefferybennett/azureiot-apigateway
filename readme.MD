# Azure IoT API Device Gateway script

## Setting up
First, using a terminal window, clone the GitHub repo ...
```
git clone https://github.com/jefferybennett/azureiot-apigateway.git
```
Next, change directories into the newly created one ...
```
cd azureiot-apigateway
```
Next, restore the Node packages needed to run the script ...
```
npm install
```
Finally, create the .env file described below.

## Environment File
Before running the script, create a file titled ".env" and provide the following text with values.
```text
APIUrl=xx.xx.com
APIUserName=
APIPassword=
AzureIoTHubOwnerConnectionString=
OutputLogs=true
```

## Running the script
To run the script, simply execute the folloiwing command in the root of the directory in a terminal window...
```
node .
```