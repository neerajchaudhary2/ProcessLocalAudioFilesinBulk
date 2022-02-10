import fetch from "node-fetch";
import {Headers} from 'node-fetch';
import fs from 'fs';

///Please enter your app Id and app secret below .
var appId=""
var appSecret=""
////Please enter folder path below where all the audio files are stored (Note all the files should be audio)
var folderPath=""
var file="";
var accessToken=""
/// Please enter below the path to the folder where you want the outputs to be stored
var writeFolderPath=""

async function writeTofile(filename , formattedTranscript , rawData , conversationId){


	await fs.writeFileSync(writeFolderPath+filename+".txt", formattedTranscript, function(err) {
                    	//await fs.writeFileSync("stl1/"+filename+".txt", transcript, function(err) {
                    		if(err) {
                    			return console.log(err);
                    		}
                    		console.log("The file was saved to file " + filename+".txt");
                    	});

	await fs.writeFileSync(writeFolderPath+filename+"Raw"+".txt", JSON.stringify(rawData,null,4), function(err) {
                    	//await fs.writeFileSync("stl1/"+filename+".txt", transcript, function(err) {
                    		if(err) {
                    			return console.log(err);
                    		}
                    		console.log("The file was saved to file " + filename+"Raw"+".txt");
                    	});
	let masterData="\n"+filename + " " + conversationId+"\n"

	await fs.appendFileSync(writeFolderPath+'MasterFile.txt', masterData);

}

async function getTranscript(accessToken,conversationId , filename)
{
	let messages=[];
	let transcript=[];
	var myHeaders = new Headers();
	myHeaders.append("x-api-key", accessToken);

	var requestOptions = {
		method: 'GET',
		headers: myHeaders,
		redirect: 'follow'
	};

	fetch("https://api-labs.symbl.ai/v1/conversations/"+conversationId+"/messages?verbose=true", requestOptions)
	.then((response) => {
		return response.json();
	})
	.then((result) => {


		console.log(result);
		let messages=result.messages;

		if(messages.length>0)
		{

			messages.forEach((message)=>{
				transcript=transcript+"\n"+message.from.name +" : "+message.text


			})
			console.log("transcript for conversationId " +conversationId +"\n"+ transcript);

			writeTofile(filename,transcript,result,conversationId);
		}

		
	})
	.catch(error => console.log('error', error));

}


async function processFiles() {

	var myHeaders = new Headers();
	myHeaders.append("Content-Type", "application/json");

	var raw = JSON.stringify({"type":"application","appId":appId,"appSecret":appSecret});

	var requestOptions = {
		method: 'POST',
		headers: myHeaders,
		body: raw,
		redirect: 'follow'
	};

	fetch("https://api-labs.symbl.ai/oauth2/token:generate", requestOptions)
	.then((response) => {
		return response.json()
	})
	.then((result) => {
		var myHeaders1 = new Headers();

		console.log(result.accessToken);
		accessToken=result.accessToken
		myHeaders1.append("x-api-key", result.accessToken);
		myHeaders1.append("Content-Type", "audio/wav");

	///Read all the files in a directory

	fs.readdir(folderPath, function(err, filenames) {
		if (err) {
			
			return console.log(err);
		}
		filenames.forEach(async function(filename) {
			console.log(filename)

			file=fs.createReadStream(folderPath+filename)
			var requestOptions1 = {
				method: 'POST',
				headers: myHeaders1,
				body:file,
				redirect: 'follow'
			};
			fetch("https://api-labs.symbl.ai/v1/process/audio?enableSpeakerDiarization=true&diarizationSpeakerCount=2", requestOptions1)
			.then((response) => {

				return response.json();

			})
			.then((result1) => {

				console.log(JSON.stringify(result1) + "   " + filename)

				////Keep checking for completition status
				var requestLoop = setInterval(function(){

					var myHeaders2 = new Headers();

					console.log(result.jobId);
					myHeaders2.append("x-api-key", accessToken);
					myHeaders2.append("Content-Type", "application/json");

					var requestOptions2 = {
						method: 'GET',
						headers: myHeaders2,
						redirect: 'follow'
					};

					fetch("https://api-labs.symbl.ai/v1/job/"+result1.jobId, requestOptions2)
					.then((response) => {
						return response.json()}
						)
					.then((result) => {

						console.log("Current job status "+ result.status + " " + result1.conversationId)
						if(result.status=="completed")
						{
							console.log("processing completed for " +filename +result1.conversationId);
							//getSentiment(myHeaders1,conversationId);

							getTranscript(accessToken,result1.conversationId , filename)





							clearInterval(requestLoop)
						}
					})
					.catch(error => console.log('error', error));

				}, 5000);

			})
			.catch(error => console.log('error', error));
			
		});
	});


	///// Read files end 

})
	.catch(error => console.log('error', error));

}

processFiles();
