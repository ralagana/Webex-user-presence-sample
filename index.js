// Globals
let service_app_token = 'SERVICE_APP_TOKEN';   // Update this value with your token

const guestToken = document.querySelector('#guest-token');
const jweToken = document.querySelector('#jwt-token-for-dest');
const message = document.querySelector('#message');

async function getGuestToken() {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Bearer ${service_app_token}`);
  
    const raw = JSON.stringify({
      "subject": "Webex Click To Call Demo",
      "displayName": "WebexOne Demo"
    });
  
    const request = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow"
    };
  
    const response = await fetch("https://webexapis.com/v1/guests/token", request);
    const data = await response.json();
    
    if (data.accessToken) {
      guestToken.value = data.accessToken;
    }
}
  
async function getJweToken() {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Bearer ${service_app_token}`);
  
    const payload =  JSON.stringify({
      "calledNumber": "HUNT_GROUP_OR_CALL_QUEUE", // Update destination queue number here
      "guestName": "Harvey"
    });
  
    const request = {
      method: "POST",
      headers: myHeaders,
      body: payload,
      redirect: "follow"
    };
    
    const response = await fetch("https://webexapis.com/v1/telephony/click2call/callToken", request);
    const result = await response.json();
    if (result.callToken) {
      jweToken.value = result.callToken;
    }
}

async function getWebexConfig() {
    const webexConfig = {
      config: {
        logger: {
          level: "debug", // set the desired log level
        },
        meetings: {
          reconnection: {
            enabled: true,
          },
          enableRtx: true,
        },
        encryption: {
          kmsInitialTimeout: 8000,
          kmsMaxTimeout: 40000,
          batcherMaxCalls: 30,
          caroots: null,
        },
        dss: {},
      },
      credentials: {
        access_token: guestToken.value,
      },
    };
  
    return webexConfig;
} 
  
async function getCallingConfig() {
    const clientConfig = {
        calling: true,
        callHistory: true,
    };
    
    const loggerConfig = {
        level: "info",
    };
    
    const serviceData = { indicator: 'guestcalling', domain: '', guestName: 'Harvey'};
    
    const callingClientConfig = {
        logger: loggerConfig,
        discovery: {
          region: "US-EAST",
          country: "US",
        },
        serviceData,
        jwe: jweToken.value
    }
  
    const callingConfig = {
        clientConfig: clientConfig,
        callingClientConfig: callingClientConfig,
        logger: loggerConfig,
    };
    
    return callingConfig;
}
  
// Function to initialize Webex and make a call
const initializeCallingAndMakeCall = async () => {
    const webexConfig = await getWebexConfig();
    const callingConfig = await getCallingConfig();
    message.textContent = 'Please wait...connecting to the available agent';

    let callingClient;
    try {
        
        // Initialize the Webex Calling SDK
        const calling = await Calling.init({webexConfig, callingConfig});

        // Create a call
        calling.on("ready", () => {
            calling.register().then(async () => {
                callingClient = window.callingClient = calling.callingClient;
    
                const localAudioStream = await Calling.createMicrophoneStream({audio: true});
                const line = Object.values(callingClient.getLines())[0];
    
                line.on('registered', (lineInfo) => {
                    console.log('Line information: ', lineInfo);
                  
                    // Create call object
                    const call = line.makeCall();
    

                    // Setup outbound call events
                    call.on('progress', (correlationId) => {
                        // Add ringback on progress
                    });
   
                    call.on('connect', (correlationId) => {
                        message.textContent = '';
                    });
                
                    call.on('remote_media', (track) => {
                    });
                
                    call.on('disconnect', (correlationId) => {
                    });

                    // Trigger an outbound call
                    call.dial(localAudioStream);
                });
                line.register();
            });
        });
    } catch (error) {
        console.error('Error initiating call', error);
    }
};

// Add event listener to the button
document.getElementById('callButton').addEventListener('click', initializeCallingAndMakeCall);