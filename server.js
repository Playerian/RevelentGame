//loading modules
var https = require('https');
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);
var fs = require('fs');
var cheerio = require('cheerio');

var port = process.env.PORT || 3000;

//constants
const debugging = true;
const mapList = require('./data/map.json');
const map1 = mapList.map1;
const weaponList = require('./data/weapon.json', 'utf-8');
const accessoryList = require('./data/accessory.json', 'utf-8');
server.listen(port);
// WARNING: app.listen(port) will NOT work here!

//serving static files
app.use(express.static('client'));

//serving html file
app.all('/', function (req, res) {
  fs.readFile(__dirname + '/client' + '/index.html', function(err, data){
    if (err) throw err;
    res.end(data);
  });
});

//socket vars
let waitList = [];
let gameList = [];
let clientId = [];
let socketList = io.sockets.sockets;

//socket events
io.on('connection', function (socket) {
  //set on disconnect
  socket.on('disconnect', function(){
    clientId.splice(clientId.indexOf(socket.id), 1);
  });
  console.log('connected');
  clientId.push(socket.id);
  socket.on('requestGame', (data) => {
    //tell the client to wait
    waitList.push({"name": data.username, "id": socket.id});
    socket.emit('registered');
  });
  //debuging
  if (debugging){
    let game = new Game(map1, new Player("player1bug", socket.id), new Player("p2 boi", 'nil'));
    socket.emit('game', game, game.p1);
    socket.emit('render', game.renderData(game.p1))
  }
});

//matching player
setInterval(function(){
  while (waitList.length > 1){
    //add first two player from waitlist to gamelist
    let p1 = waitList[0];
    let p2 = waitList[1];
    let game = new Game(map1, p1, p2);
    //remove
    waitList.splice(0, 1);
    waitList.splice(0, 1);
    //send client to the game
    runGame(game);
  }
}, 2000);
//running the game
function runGame(game){
  socketList[game.p1.id].emit('game', game, 'p1').emit(game.renderData(game.p1));
  socketList[game.p2.id].emit('game', game, 'p2').emit(game.renderData(game.p1));
}

//map list
//w - wall
//r - road
//t - tower

//utility
function randomName(){
  let first = ['Bob'];
  let last = ['The tester'];
  return `${first[Math.floor(Math.random() * first.length)]} ${last[Math.floor(Math.random() * last.length)]}`
}

//classic classing
class Item {
  constructor (id, type){
    if (type === 0){
      Object.assign(this, weaponList[id]);
    }else{
      Object.assign(this, accessoryList[id]);
    }
  }
}

class Inventory {
  constructor (){
    this.space = [];
    this.extra = [];
    this.equiping;
  }
  equip (index, extra){
    if (extra){
      this.equipping = this.extra[index];
    }else{
      this.equipping = this.space[index];
    }
  }
  newItem (id, type){
    this.space.push(new Item(id, type));
  }
  newExtra (id, type){
    this.extra.push(new Item(id, type));
  }
  get spaceLength(){
    return this.space.length;
  }
  get extraLength(){
    return this.extra.length;
  }
}

class Buffs {
  constructor (){
    
  }
}

class Unit {
  constructor (object, x, y, hp, name, atk, spd, def, mdf, mbi, sprite){
    if (typeof(object) !== 'object') {object = {}}
    this.player = object.player || "nil";
    this.x = object.x || x;
    this.y = object.y || y;
    this.hp = object.hp || hp;
    this.name = object.name || name;
    this.atk = object.atk || atk;
    this.spd = object.spd || spd;
    this.def = object.def || def;
    this.mdf = object.mdf || mdf;
    this.mbi = object.mbi || mbi;
    this.sprite = object.sprite || sprite || 'img/units/baseUnit.png';
    this.runTime = 0;
    this.runSpeed = 25;
    this.buyable = object.buyable;
    this.inventory = new Inventory();
    this.buffList = new Buffs();
  }
}

class Combatant extends Unit{
  constructor(object, x, y, hp, type, name, atk, spd, def, mdf, mbi){
    super(object, x, y, hp, name, atk, spd, def, mdf, mbi);
    this.type = type;
  }
}

class Warden extends Unit{
  constructor(player, x, y){
    super({player: player}, x, y, 1, 'warden', 0, 0, 0, 0, 0, 0);
    this.type = 'warden';
  }
}

class Tower extends Unit{
  constructor(player, x, y){
    super({sprite: 'img/units/tower.png', player: player}, x, y, 100, 'tower', 30, 15, 0, 0, 0);
    this.type = 'tower';
    this.inventory.newItem(0, 0);
    this.inventory.newItem(0, 1);
  }
}

class Nexus extends Unit{
  constructor(player, x, y){
    super({sprite: 'img/units/nexus.png', player: player}, x, y, 200, 'nexus', 0, 99, 0, 0, 0);
    this.type = 'nexus';
  }
}

class Player extends Unit{
  constructor(name, id, gameId){
    super({spd: 5}, -777, -777, 1, 'player', 0, 0, 0, 0, 0, 0);
    this.runSpeed = 50;
    this.name = name;
    this.id = id;
    this.gameId = gameId;
    this.type = 'player';
    this.coin = 500;
    this.knownUnit = [];
  }
}

class Tile{
  constructor(x, y, type){
    this.units = [];
    this.x = x;
    this.y = y;
    this.type = type;
    this.fog = false;
  }
  set addUnit(unit){
    this.units.push(unit);
  }
}

class Board{
  constructor(map, game){
    //load the map first
    let theMap = JSON.parse(JSON.stringify(map));
    this.tiles = JSON.parse(JSON.stringify(map));
    this.unitLists = [];
    //loop through all tiles
    this.setAllFog = function(){
      let theMap = this.tiles;
      for (let i = 0; i < theMap.length; i ++){
        let row = theMap[i];
        for (let i2 = 0; i2 < row.length; i2 ++){
          let tile = row[i2];
          tile.fog = true;
        }
      }
    }
    for (let i = 0; i < theMap.length; i ++){
      let row = theMap[i];
      for (let i2 = 0; i2 < row.length; i2 ++){
        var newUnit;
        switch (row[i2]){
          case 'r':
            this.tiles[i2][i] = new Tile(i2, i, 'road');
            break;
          case 'w':
            this.tiles[i2][i] = new Tile(i2, i, 'wall');
            break;
          //tower
          case 't':
            //consider side
            this.tiles[i2][i] = new Tile(i2, i, 'road');
            if (i2 - i > 0){
              newUnit = new Tower(game.p2, i2, i);
            }else{
              newUnit = new Tower(game.p1, i2, i);
            }
            this.newUnit(newUnit, i2, i);
            break;
          //nexus
          case 'n':
            this.tiles[i2][i] = new Tile(i2, i, 'road');
            if (i2 - i > 0){
              newUnit = new Nexus(game.p2, i2, i);
            }else{
              newUnit = new Nexus(game.p1, i2, i);
            }
            this.newUnit(newUnit, i2, i);
            break;
          //baron
          case 's':
            this.tiles[i2][i] = new Tile(i2, i, 'road');
            break;
          //dragon
          case 'd':
            this.tiles[i2][i] = new Tile(i2, i, 'road');
            break;
        }
      }
    }
  }
  newUnit(unit, x, y){
    this.unitLists.push(unit);
    if (this.tiles[x]){
      if (this.tiles[x][y]){
        this.tiles[x][y].addUnit = unit;
      }
    }
    //add id
    unit.unitId = this.unitLists.length - 1;
    return unit;
  }
  removeUnit(unit){
    let id = unit.unitId;
    //remove from board list
    this.unitLists.splice(this.unitLists.indexOf(unit), 1);
    //remove from tile
    let tile;
    if (this.tiles[unit.x] && this.tiles[unit.x][unit.y]){
      tile = this.tiles[unit.x][unit.y];
      tile.units.splice(tile.units.indexOf(unit), 1);
    }
    //remove id
    for (let i = id; i < this.unitLists.length; i ++){
      this.unitList[i].unitId = i;
    }
    return unit;
  }
  //getter
  get moveableUnits(){
    let arr = [];
    this.unitLists.forEach(function(v){
      if (v.type !== 'tower' && v.type !== 'warden' && v.type !== 'nexus'){
        arr.push(v);
      }
    });
    return arr;
  }
}

//classic game classing
class Game {
  constructor (map, player1, player2){
    this.id = gameList.push(this) - 1;
    if (player1){
      this.p1 = new Player(player1.name, player1.id, this.id);
      this.p2 = new Player(player2.name, player2.id, this.id);
    }
    this.map = JSON.parse(JSON.stringify(map));
    this.board = new Board(this.map, this);
    //push player in
    this.board.newUnit(this.p1, this.p1.x, this.p1.y);
    this.board.newUnit(this.p2, this.p2.x, this.p2.y);
    this.rectSize = 15;
    //set up spawn
    if (map === map1){
      this.p1.spawn = [[0, 29], [0, 28], [0, 27], [1, 27], [2, 27], [2, 28], [2, 29], [1, 29]];
      this.p2.spawn = [[0, 29], [0, 28], [0, 27], [1, 27], [2, 27], [2, 28], [2, 29], [1, 29]];
      this.p2.spawn.forEach((v) => {v.reverse()});
    }
    //set up unit loops
    this.loop = this.board.moveableUnits;
    this.turn = 'undefined';
    //prepare to receive messages from client
    let game = this;
    let p1Socket = game.getSocket(game.p1.id);
    let p2Socket = game.getSocket(game.p2.id);
    if (p1Socket){
      p1Socket.on('newUnit', function(unit, x, y){
        game.addNewUnit(p1Socket, unit, x, y);
      });
    }
    if (p2Socket){
      p2Socket.on('newUnit', function(unit, x, y){
        game.addNewUnit(p2Socket, unit, x, y);
      });
    }
  }
  addNewUnit(socket, unit, x, y){
    let game = this;
    let player = game.getPlayerById(socket.id);
    if (x < 0 || y < 0){
      return;
    }
    //check if the tile already has unit
    let terminate = false;
    let unitList = game.board.tiles[x][y].units;
    if (unitList.length > 0){
      //loop through
      for (let i = 0; i < unitList.length; i ++){
        if (unitList[i].constructor.name !== 'Warden'){
          terminate = true;
          break;
        }
      }
    }
    //make unit into board
    if (!terminate){
      if (unit === 'baseUnit'){
        //deduct coin
        if (player.coin >= 100){
          player.coin -= 100;
          game.board.newUnit(new Combatant({}, x, y, 20, 'baseUnit', randomName(), 10, 10, 10, 10, 3), x, y);
        }
      }
    }
    //send board back to client
    if (debugging){
      game.getSocket(game.p1).emit('render', game.renderData(game.p1));
    }else{
      game.getSocket(game.p1).emit('render', game.renderData(game.p1));
      game.getSocket(game.p2).emit('render', game.renderData(game.p2));
    }
  }
  getPlayerByName(name){
    if (name === this.p1.name){
      return this.p1;
    }else{
      return this.p2;
    }
  }
  getPlayerById(id){
    if (id === this.p1.id){
      return this.p1;
    }else{
      return this.p2;
    }
  }
  getSocket(id){
    //robustness
    if (typeof id === "string"){
      return socketList[id];
    }else{
      return socketList[id.id];
    }
  }
  renderData(player){
    //clone the current board
    let data = new RenderData(this, player, JSON.parse(JSON.stringify(this.board)));
    return data;
  }
  //unit loop
  oneLoop(game){
    //increase every unit
    let units = this.board.moveableUnits;
    units.forEach(function(v){
      v.runTime += v.runSpeed;  
    });
    //sort
    units.sort(function(a, b){
      return parseFloat(b.runTime) - parseFloat(a.runTime);
    });
    //check over 100
    if (units[0].runTime >= 100){
      this.turn = units[0];
    }
    //aftermath
    /*
    this.loop.push(this.loop.shift());
    this.turn = this.loop[0];
    */
  }    
}

class RenderData{
  constructor (game, player, boarding){
    //send player
    //duplicate player
    this.player = player;
    //send rendering board
    this.board = boarding;
    let board = this.board;
    board.setAllFog = function(){
      let theMap = this.tiles;
      for (let i = 0; i < theMap.length; i ++){
        let row = theMap[i];
        for (let i2 = 0; i2 < row.length; i2 ++){
          let tile = row[i2];
          tile.fog = true;
        }
      }
    };
    board.cleanFog = function(unit, tileNo){
      if (!tileNo) {tileNo = 1;}
      let tiles = this.tiles;
      let x = unit.x;
      let y = unit.y;
      tiles[x][y].fog = false;
      for (let i = 1; i <= tileNo; i ++){
        //side
        (tiles[x + i]) && (tiles[x + i][y]) && (tiles[x + i][y].fog = false);
        (tiles[x - i]) && (tiles[x - i][y]) && (tiles[x - i][y].fog = false);
        (tiles[x]) && (tiles[x][y + i]) && (tiles[x][y + i].fog = false);
        (tiles[x]) && (tiles[x][y - i]) && (tiles[x][y - i].fog = false);
        //edge
        for (let i2 = 1; i2 < i; i2 ++){
          let xMove = i2;
          let yMove = i - i2;
          (tiles[x + xMove]) && (tiles[x + xMove][y + yMove]) && (tiles[x + xMove][y + yMove].fog = false);
          (tiles[x - xMove]) && (tiles[x - xMove][y + yMove]) && (tiles[x - xMove][y + yMove].fog = false);
          (tiles[x + xMove]) && (tiles[x + xMove][y - yMove]) && (tiles[x + xMove][y - yMove].fog = false);
          (tiles[x - xMove]) && (tiles[x - xMove][y - yMove]) && (tiles[x - xMove][y - yMove].fog = false);
        }
      }
    };
    let list = board.unitLists;
    let tiles = board.tiles;
    //add fog of war to all tiles
    board.setAllFog();
    //loop through the list and get fog of war
    for (let i = 0; i < list.length; i ++){
      let unit = list[i];
      if (unit.player.name === player.name){
        //clear fog of war
        switch (unit.type){
          case 'nexus':
            board.cleanFog(unit, 6);
            break;
          case 'tower':
            board.cleanFog(unit, 4);
            break;
          case 'warden':
            board.cleanFog(unit, 4);
            break;
          default:
            board.cleanFog(unit, 3);
            break;
        }
      }
    }
    //send unit list
    this.unitList = [];
    let realUnitList = game.board.moveableUnits;
    //make unit unknown if in fog
    //load previous
    let known = player.knownUnit;
    //loop through
    for (let i = 0; i < realUnitList.length; i ++){
      //check if in fog
      let unit = realUnitList[i];
      //if player
      if (unit.type === 'player'){
        //just push
        this.unitList.push(unit);
      }
      //if fog
      else if (tiles[unit.x][unit.y].fog === true){
        //check if exists in known for player
        //implement later maybe
        /*
        if (known.includes(unit)){
          
        }
        */
        //push a ghost
        this.unitList.push('?');
      }
      //if no fog then push
      else {
        this.unitList.push(unit);
      }
    }
  }
}



