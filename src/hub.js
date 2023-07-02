/********************************************************/
/* HUB                                                  */
/* Para executar use: node hub.js &                     */
/********************************************************/
process.title = 'hub';
const Version = 'v1.0.0';

async function GetDate() {
	let offset = new Date(new Date().getTime()).getTimezoneOffset();
	return new Date(new Date().getTime() - (offset*60*1000)).toISOString().replace(/T/,' ').replace(/\..+/, '');
}

// Publish message to whatsapp
async function PublishMsg(msg) {
	pub.publish('msg:san_message','{"msg":"'+msg+'"}');
}

// Publish update status
async function PublishUpdate() {
	GetDate().then(dte => {
		let uptime = Date.parse(dte) - starttime;
		pub.publish('san:server_update','{"name":"'+process.title+'","version":"'+Version+'","ipport":"'+process.env.SrvIP+':'+process.env.SrvPort+'","uptime":"'+Math.floor(uptime/60000)+'"}');
	});
}

// Inicializa variaveis globais
var clients = [];

const { log } = require('console');
/****************************************************************************************************/
/* Read enviroment variables																		*/
/****************************************************************************************************/
const dotenv = require('dotenv');
dotenv.config();

/****************************************************************************************************/
/* Create and open express connection 																*/
/****************************************************************************************************/
const app = require('express');
const http = require('http').createServer(app);
http.listen(process.env.SrvPort || 50900);

/****************************************************************************************************/
/* Socket.io      																					*/
/****************************************************************************************************/
const io = require('socket.io')(http, {
	cors: {
	  origin: '*',
	}
  });

io.on('connection', (socket) =>{
    socket.on('session', (data)=>{
		console.log(data);
	    socket.emit('session', '{"sid","asdads"}');
    })
	// Envia versao do SAN
	socket.emit('app_version', process.title + ' ('+Version+')');
	
    socket.on('message', (msg)=>{
        socket.broadcast.emit('message', msg)
    })

    socket.on('typing', (data)=>{
        socket.broadcast.emit('typing', data)
    })
});

// Send servers status
async function SendUpdate(){
	// Pega data e hora atual e percorre a lista de servidores verificando qual foi o último envio
	GetDate().then(dte => {
		
	});
}

/****************************************************************************************************/
/* Create and open Redis connection 																*/
/****************************************************************************************************/
const Redis = require('ioredis');
const hub = new Redis({host:process.env.RD_host, port:process.env.RD_port, password:process.env.RD_pass});
const pub = new Redis({host:process.env.RD_host, port:process.env.RD_port, password:process.env.RD_pass});

// Updates server status as soon as it successfully connects
hub.on('connect', function () { PublishUpdate(); GetDate().then(dte =>{ console.log('\033[36m'+dte+': \033[32mHUB connected.\033[0;0m');
																		console.log('\033[36m'+dte+': \033[32mWaiting clients...\033[0;0m');}); });

// Subscribe on chanels
hub.subscribe("san:server_update","san:monitor_update", (err, count) => {
  if (err) {
	console.log('\033[36m'+dte+': \033[31mFailed to subscribe: '+ err.message +'\033[0m');
  } 
});

// Waiting messages
hub.on("message", (channel, message) => {
  switch (channel) {
	case 'san:server_update' :
		break;

	case 'san:monitor_update' :
		io.emit("dev_monitor",message);
		break;
	  
  }
	
  
});

/****************************************************************************************************/
/* Create and open MySQL connection																	*/
/****************************************************************************************************/
const mysql = require('mysql');
const db = mysql.createPool({host:process.env.DB_host, database:process.env.DB_name, user:process.env.DB_user, password:process.env.DB_pass, connectionLimit:10});

// Initialize global variables
var starttime=0,numdev=0,msgsin=0,msgsout=0,bytsin=0,bytsout=0,bytserr=0;

// Update statistics ever 60s
setInterval(function() {
			// Get datetime
			let dte = new Date(new Date().getTime()).toISOString().replace(/T/,' ').replace(/\..+/, '');
			// Publish update status
			PublishUpdate();
			// Update database
			db.getConnection(function(err,connection){
				if (!err) {
					connection.query('INSERT INTO syslog (datlog,server,version,ipport,devices,msgsin,msgsout,bytsin,bytsout,bytserr) VALUES (?,?,?,?,?,?,?,?,?,?)',[dte, process.title, Version, process.env.SrvIP + ':' + process.env.SrvPort, numdev, msgsin, msgsout, bytsin, bytsout, bytserr],function (err, result) {connection.release(); if (err) err => console.error(err);});
				}
				msgsin=0;
				msgsout=0;
				bytsin=0;
				bytsout=0;
				bytserr=0;
			});
},60000);

/****************************************************************************************************/
/* 	Show parameters and waiting clients																*/
/****************************************************************************************************/
const OS = require('os');
GetDate().then(dte => {
	// Save start datetime
	starttime = Date.parse(dte);
	// Show parameters and waiting clients
	console.log('\033[36m'+dte+': \033[37m================================');
	console.log('\033[36m'+dte+': \033[37mAPP : ' + process.title + ' ('+Version+')');
	console.log('\033[36m'+dte+': \033[37mIP/Port : ' + process.env.SrvIP + ':' + process.env.SrvPort);
	console.log('\033[36m'+dte+': \033[37mCPUs: '+ OS.cpus().length);
	console.log('\033[36m'+dte+': \033[37m================================');});