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
app.use('/favicon.ico', express.static('images/favicon.ico'));

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
    game.board.newUnit(new Combatant({player: game.p2}, 20, 10, 20, 'baseUnit', randomName(), 10, 10, 10, 10, 3), 20, 10);
    socket.emit('game', game, game.p1);
    socket.emit('render', game.renderData(game.p1));
    game.oneLoop(game);
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
    this.moveableUnits = [];
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
    //push if movable
    if (unit.type !== 'tower' && unit.type !== 'warden' && unit.type !== 'nexus'){
      this.moveableUnits.push(unit);
    }
    return unit;
  }
  removeUnit(unit){
    let id = unit.unitId;
    //remove from board list
    this.unitLists.splice(this.unitLists.indexOf(unit), 1);
    //remove from movable unit
    if (unit.type === 'tower' || unit.type === 'warden' || unit.type === 'nexus'){
      this.moveableUnits.splice(this.moveableUnits.indexOf(unit), 1);
    }
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
  //searcher
  searchById(id){
    let unit;
    this.unitLists.forEach(function(v){
      if (v.unitId === id){
        unit = v;
        return unit;
      }
    });
    return unit;
  }
  //getter
  
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
      p1Socket.on('endTurn', function(socketId, unit){
        game.endTurn(socketId, unit);
      });
    }
    if (p2Socket){
      p2Socket.on('newUnit', function(unit, x, y){
        game.addNewUnit(p2Socket, unit, x, y);
      });
      p2Socket.on('endTurn', function(socketId, unit){
        game.endTurn(socketId, unit);
      });
    }
  }
  //getter
  get p1Socket(){
    return this.getSocket(this.p1.id);
  }
  get p2Socket(){
    return this.getSocket(this.p2.id);
  }
  //methods for socket event
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
          let newunit = new Combatant({}, x, y, 20, 'baseUnit', randomName(), 10, 10, 10, 10, 3);
          newunit.player = player;
          game.board.newUnit(newunit, x, y);
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
  endTurn(socketId, united){
    //search unit base on unit id
    let unit = this.board.searchById(united.unitId);
    //check if same socket by comparing socket id
    if (unit.id === socketId){
      //same id
      //check if turn
      if (this.turn === unit){
        //end turn
        let units = this.board.moveableUnits;
        units[0].runTime = 0;
        units.push(units.shift());
        //then run loop
        this.oneLoop(this);
      }
    }
  }
  //utlity methods
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
  //render methods
  renderData(player){
    //clone the current board
    let data = new RenderData(this, player, JSON.parse(JSON.stringify(this.board)));
    return data;
  }
  sendRenderData(){
    if (this.p1Socket){
      this.p1Socket.emit('render', this.renderData(this.p1));
    }
    if (this.p2Socket){
      this.p2Socket.emit('render', this.renderData(this.p2));
    }
  }
  grabTiles(tiles, x, y, tileNo, self){
    let allTiles = [];
    if (self){
      allTiles.push(tiles[x][y]);
    }
    for (let i = 1; i <= tileNo; i ++){
      //side
      (tiles[x + i]) && (tiles[x + i][y]) && (allTiles.push(tiles[x + i][y]));
      (tiles[x - i]) && (tiles[x - i][y]) && (allTiles.push(tiles[x - i][y]));
      (tiles[x]) && (tiles[x][y + i]) && (allTiles.push(tiles[x][y + i]));
      (tiles[x]) && (tiles[x][y - i]) && (allTiles.push(tiles[x][y - i]));
      //edge
      for (let i2 = 1; i2 < i; i2 ++){
        let xMove = i2;
        let yMove = i - i2;
        (tiles[x + xMove]) && (tiles[x + xMove][y + yMove]) && (allTiles.push(tiles[x + xMove][y + yMove]));
        (tiles[x - xMove]) && (tiles[x - xMove][y + yMove]) && (allTiles.push(tiles[x - xMove][y + yMove]));
        (tiles[x + xMove]) && (tiles[x + xMove][y - yMove]) && (allTiles.push(tiles[x + xMove][y - yMove]));
        (tiles[x - xMove]) && (tiles[x - xMove][y - yMove]) && (allTiles.push(tiles[x - xMove][y - yMove]));
      }
    }
    return allTiles;
  }
  //unit loop
  oneLoop(game){
    let units = this.board.moveableUnits;
    //while less than 100
    if (debugging){
      let preventer = 0;
      while (units[0].player.name === "p2 boi" || units[0].name === 'p2 boi'){
        units[0].runTime = 0;
        units.push(units.shift());
        preventer ++;
        if (preventer > 50){
          break;
        }
      }
    }
    while(units[0].runTime < 100){
      //increase every unit
      units.forEach(function(v){
        v.runTime += v.runSpeed;  
      });
      //sort
      units.sort(function(a, b){
        return parseFloat(b.runTime) - parseFloat(a.runTime);
      });
    }
    if (debugging){
      let preventer = 0;
      while (units[0].player.name === "p2 boi" || units[0].name === 'p2 boi'){
        units[0].runTime = 0;
        units.push(units.shift());
        preventer ++;
        if (preventer > 50){
          break;
        }
      }
    }
    this.turn = units[0];
    console.log(this.turn);
    //emitting
    this.sendRenderData();
    //aftermath
    /*
    
    this.turn = this.loop[0];
    */
  }    
}

class RenderData{
  constructor (game, player, boarding){
    //send player
    //duplicate player
    this.player = player;
    //send rendering dupe board
    this.board = boarding;
    //remove board unit
    this.board.unitLists = [];
    this.board.moveableUnits = [];
    //send current unit
    this.turn = game.turn;
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
      let tilesss = game.grabTiles(tiles, x, y, tileNo, true);
      tilesss.forEach(function(v){
        v.fog = false;
      });
    };
    let realList = game.board.unitLists;
    //add fog of war to all tiles
    board.setAllFog();
    //loop through the list and get fog of war
    for (let i = 0; i < realList.length; i ++){
      let unit = realList[i];
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
    let fakeList = this.board.unitLists;
    let fakeMoveList = this.board.moveableUnits;
    let realUnitList = game.board.unitLists;
    let realMovable = game.board.moveableUnits;
    //make unit unknown if in fog
    //load previous
    let known = player.knownUnit;
    //set tiles to made board
    let tiles = board.tiles;
    //make fake unit list
    for (let i = 0; i < realUnitList.length; i ++){
      //check if in fog
      let unit = realUnitList[i];
      let fake = Object.assign({}, unit);
      //settle security
      if (unit.player !== player && unit !== player){
        fake.player = 'not you';
      }
      //if player
      if (unit.type === 'player'){
        //if opponent
        if (unit !== player){
          fake.id = undefined;
        }
        fakeList.push(fake);
      }
      //if fog
      else if (tiles[unit.x][unit.y].fog === true){
        //check if exists in known for player
        //implement later maybe
        /*
        if (known.includes(unit)){
          
        }
        */
        if (unit.type === 'tower' || unit.type === 'nexus'){
          fakeList.push(fake);
        }else{
          fakeList.push(unit.runTime);
        }
      }
      //if no fog then push
      else {
        //remove id if opponent
        fakeList.push(fake);
      }
    }
    //make fake movable
    for (let i = 0; i < realMovable.length; i ++){
      let unit = realMovable[i];
      let fake = Object.assign({}, unit);
      //settle security
      if (unit.player !== player && unit !== player){
        fake.player = 'not you';
      }
      //if player
      if (unit.type === 'player'){
        //if opponent
        if (unit !== player){
          fake.id = undefined;
        }
        fakeMoveList.push(fake);
      }
      //if fog
      else if (tiles[unit.x][unit.y].fog === true){
        fakeMoveList.push(unit.runTime);
      }
      //if no fog then push
      else {
        //remove id if opponent
        fakeMoveList.push(fake);
      }
    }
  }
}



