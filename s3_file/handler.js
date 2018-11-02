const AWS = require("aws-sdk");
const s3 = new AWS.S3();

// https://gist.github.com/6174/6062387
const rand = () =>  Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const sendResponse = (event, context, responseStatus, Key, id) => {
	return new Promise((res, rej) => {
		var responseBody = JSON.stringify({
			Status: responseStatus,
			PhysicalResourceId: id,
			Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
			StackId: event.StackId,
			RequestId: event.RequestId,
			LogicalResourceId: event.LogicalResourceId,
			Data: {Key}
		});
	
		console.log("RESPONSE BODY:\n", responseBody);
	
		const https = require("https");
		const url = require("url");
	
		const parsedUrl = url.parse(event.ResponseURL);
		const options = {
			hostname: parsedUrl.hostname,
			port: 443,
			path: parsedUrl.path,
			method: "PUT",
			headers: {
				"content-type": "",
				"content-length": responseBody.length
			}
		};
	
		console.log("SENDING RESPONSE...\n");
	
		const request = https.request(options, function(response) {
			console.log("STATUS: " + response.statusCode);
			console.log("HEADERS: " + JSON.stringify(response.headers));

			context.done();

			res();
		});
	
		request.on("error", function(error) {
			console.log("sendResponse Error:" + error);

			context.done();

			rej();
		});
	
		request.write(responseBody);
		request.end();
	});
}

const cleanup = async (Bucket, Key) => {
	await s3.deleteObject({
		Bucket,
		Key
	}).promise();
}

const getKey = (keyPrefix, keySuffix, id) => {
	return `${keyPrefix}-${id}${keySuffix}`;
}

exports.index = async (event, context) => {
	const {Bucket, KeyPrefix, KeySuffix, Content} = event.ResourceProperties;

	const id = event.PhysicalResourceId || rand();
	const Key = getKey(KeyPrefix, KeySuffix, id);

	try {
		console.log("REQUEST RECEIVED:\n" + JSON.stringify(event));

		if (event.RequestType == "Delete") {
			await cleanup(Bucket, Key);

			await sendResponse(event, context, "SUCCESS", Key, id);
			return;
		}

		if (event.RequestType === "Update") {
			const {Bucket: oldBucket, KeyPrefix: oldKeyPrefix, KeySuffix: oldKeySuffix} = event.OldResourceProperties;

			const oldKey = getKey(oldKeyPrefix, oldKeySuffix, id);
			await cleanup(oldBucket, oldKey);
		}

		await s3.deleteObject({
			Bucket,
			Key
		}).promise();

		const res = await s3.putObject({
			Body: Buffer.from(Content, 'binary'),
			Bucket,
			Key
		}).promise();

		console.log(JSON.stringify(res));

		await sendResponse(event, context, "SUCCESS", Key, id);
	}catch(e) {
		console.error(e);
		await sendResponse(event, context, "FAILURE", Key, id);
	}
};
