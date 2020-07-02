const parentElementId = "maintable";  //テーブルをくっつける親エレメントのid
const fieldTableId = "fieldTable";    //テーブルエレメントのid

//各プレイヤーとエリアの色
const colors = {
  p1Agent: "#0096ff",
  p2Agent: "#FF0200",
  p1Wall : "#0096ff",
  p2Wall : "#FF0200",
  p1Area : "#80C9FF",
  p2Area : "#FE9998",
  p1RemovingAgent: "white",
  p2RemovingAgent: "white",
  suggestPoint: "#a4f757",
  suggestArea: "#d1fca9"
}

//タイルの状態番号
const fieldNumber = {
  NONE: 0,
  p1Agent: 1,
  p1Wall: 2,
  p1Area: 3,
  p2Agent: 4,
  p2Wall: 5,
  p2Area: 6,
  p1RemovingAgent: 7,
  p2RemovingAgent: 8
}

const actions = {
  PUT: 0,
  MOVE: 1,
  MOVING: 2,
  REMOVE: 3,
  REMOVEAGENTSELECT: 4,
  NONE: 5
}

class Backup{
  constructor(field){
    this.field = field;
  }
}

class Field{
  constructor(w, h){
    this.board;
    this.tiles = [];
    this.agents = [];
    this.actions = [];
    this.backup = new Backup(JSON.parse(JSON.stringify(this)));
    for(let i = 0; i< w; i++){
      let tmp = new Array(w);
      for(let j = 0; j< h; j++){
        tmp[j] = fieldNumber.NONE;
      }
      this.tiles.push(tmp);
    }
  }

  putAgent(x, y, playerIndex, turnNumber){
    let agentIndex = this.agentIndex(-1, -1, playerIndex);
    this.agents[agentIndex].x = x;
    this.agents[agentIndex].y = y;
    this.backup.field.agents[agentIndex].lastActionType = actions.PUT;
    this.agents[agentIndex].lastActionTurn = turnNumber;
  }

  //プレイヤーに関係なくAgentがいるかどうか
  isAgent(x, y){
    for(let i = 0; i<this.agents.length; i++){
      if(this.agents[i].x == x && this.agents[i].y == y)
        return true;
    }
    return false;
  }

  agentIndex(x, y, playerIndex){
    for(let i = 0; i<this.agents.length; i++){
      if(this.agents[i].x == x && this.agents[i].y == y && this.agents[i].playerIndex == playerIndex)
        return i;
    }
    return -1;
  }

  agentIndexFromId(agentId){
    for(let i = 0; i<this.agents.length; i++){
      if(this.agents[i].agentId == agentId)
        return i;
    }
    return -1;
  }

  agentId(x, y, playerIndex){
    let agentIndex = this.agentIndex(x, y, playerIndex);
    if(agentIndex == -1)
      return -1;
    return this.agents[agentIndex].agentId;
  }

  numberOfAgents(playerIndex){
    let count = 0;
    for(let i = 0; i<this.agents.length; i++){
      if(this.agents[i].playerIndex == playerIndex &&
        this.agents[i].x >= 0 &&
        this.agents[i].y >= 0)
        count++;
    }
    return count;
  }

  numberOfMovedAgents(playerIndex, turnNumber){
    let count = 0;
    for(let i = 0; i<this.agents.length; i++){
      if(this.agents[i].playerIndex == playerIndex &&
        this.agents[i].lastActionTurn == turnNumber)
        count++;
    }
    return count;
  }

  appendAgent(agent){
    this.agents.push(agent);
    this.backup = new Backup(JSON.parse(JSON.stringify(this)));
  }

  restoreBackup(){
    let tmp = JSON.parse(JSON.stringify(this.backup));
    this.tiles = tmp.field.tiles;
    this.agents = tmp.field.agents;
  }


  override(){
    this.actions = [];
    this.backup = new Backup(JSON.parse(JSON.stringify(this)));
  }

  appendAction(action){
    this.actions.push(action);
  }
}

class Board{
  constructor(w, h, points, nagent){
    this.w = w;
    this.h = h;
    this.points = points;
    this.field = new Field(w, h);
    this.nagent = nagent;
    //移動元エージェントId
    this.selectAgentId = null;
    //排除対象x, y
    this.removeTarget = [-1, -1];
    this.tmpAgent =[-1, -1];
    this.checkdTiles = []
    this.operatingMode = actions.NONE;
  }

  fillArea(){
    // 外側1ます残した内側を全点チェック
    // チェック済みであれば次の点
    // 上下左右斜め、8方向をチェックし、外周にでたら中断（塗りなし確定）、壁であればチェック継続
    // すべてのチェック終了で、そのプレイヤーの色で塗る

    const w = this.w;
    const h = this.h;
    let thisField = new Array(w * h);
    //塗りつぶしをいったんリセット
    for(let x = 0; x < this.w; x++){
      for(let y = 0; y < this.h; y++){
        if(this.field.tiles[y][x] == fieldNumber.p1Area)
        {
          this.field.tiles[y][x] = fieldNumber.NONE;
        }
        if(this.field.tiles[y][x] == fieldNumber.p2Area)
        {
          this.field.tiles[y][x] = fieldNumber.NONE;
        }
      }
    }

    for(let x = 0; x < this.w; x++){
      for(let y = 0; y < this.h; y++){
        if(this.field.tiles[y][x] == fieldNumber.p1Agent ||
          this.field.tiles[y][x] == fieldNumber.p1Wall)
        {
          thisField[x + y * this.w] = [1, 0];
        }
        else if(this.field.tiles[y][x] == fieldNumber.p2Agent ||
          this.field.tiles[y][x] == fieldNumber.p2Wall)
        {
          thisField[x + y * this.w] = [1, 1];
        }
        else{
          thisField[x + y * this.w] = [0, -1];
        }
      }
    }

    const field = JSON.parse(JSON.stringify(thisField));

    for (let pid = 0; pid < 2; pid++) {
      const flg = new Array(w * h);
      for (let i = 1; i < w - 1; i++) {
        for (let j = 1; j < h - 1; j++) {
          if (
            flg[i + j * w] || thisField[i + j * w][0] === 1
          ) {
            continue;
          }
          const fill = new Array(w * h);
          const chk = function (x, y) {
            if (x < 0 || x >= w || y < 0 || y >= h) return false;
            const n = x + y * w;
            if (fill[n]) return true;
            fill[n] = true;

            const f = field[n];
            if (f[0] === 1) {
              if (f[1] === pid) {
                return true;
              }
            } else {
              fill[n] = true;
            }
            if (!chk(x - 1, y)) return false;
            if (!chk(x + 1, y)) return false;
            if (!chk(x - 1, y - 1)) return false;
            if (!chk(x, y - 1)) return false;
            if (!chk(x + 1, y - 1)) return false;
            if (!chk(x - 1, y + 1)) return false;
            if (!chk(x, y + 1)) return false;
            if (!chk(x + 1, y + 1)) return false;
            return true;
          };
          if (chk(i, j)) {
            fill.forEach((f, idx) => {
              if (thisField[idx][0] == 0) {
                thisField[idx][1] = pid;
                flg[idx] = true;
              }
            });
          }
        }
      }
    }

    for(let x = 0; x < this.w; x++){
      for(let y = 0; y < this.h; y++){
        if(thisField[x + y * this.w][0] == 0 &&
          thisField[x + y * this.w][1] == 0)
        {
          this.field.tiles[y][x] = fieldNumber.p1Area;
        }
        else if(thisField[x + y * this.w][0] == 0 &&
                thisField[x + y * this.w][1] == 1)
        {
          this.field.tiles[y][x] = fieldNumber.p2Area;
        }
      }
    }


    this.calcScore()
  }

  calcScore(){
    let p1Score = [0, 0]
    let p2Score = [0, 0]
    for(let w = 0; w < this.w; w++){
      for(let h = 0; h < this.h; h++){
        if(this.field.tiles[h][w] == fieldNumber.p1Agent ||
          this.field.tiles[h][w] == fieldNumber.p1Wall)
        {
          p1Score[0] += this.points[h][w];
        }
        if(this.field.tiles[h][w] == fieldNumber.p1Area){
          p1Score[1] += Math.abs(this.points[h][w]);
        }
        if(this.field.tiles[h][w] == fieldNumber.p2Agent ||
          this.field.tiles[h][w] == fieldNumber.p2Wall)
        {
          p2Score[0] += this.points[h][w];
        }
        if(this.field.tiles[h][w] == fieldNumber.p2Area){
          p2Score[1] += Math.abs(this.points[h][w]);
        }
      }
    }
    document.getElementById("p1Score").innerHTML = (p1Score[0] + p1Score[1]);
    document.getElementById("p2Score").innerHTML = (p2Score[0] + p2Score[1]);
  }

  checkConflict(turnNumber){
    console.clear();
    this.field.restoreBackup();
    //コンフリクトのチェック
    //新しく生成したフィールドデータで置き換え
    let message = "";
    let conflictCount = 0;

    //行動の先がかぶったらコンフリクト
    for(let i = 0; i < this.field.actions.length; i++){
      for(let j = 0; j < this.field.actions.length; j++){
        if(i != j){
          if(this.field.actions[j].x == this.field.actions[i].x &&
            this.field.actions[j].y == this.field.actions[i].y){
              this.field.actions[j].conflict = true;
              //console.log("Normal conflict")
              conflictCount++;
            }
        }
      }
    }

    //移動指定先の敵エージェントが移動していなかったらコンフリクト発生
    console.log(this.field.agents);
    for(let i = 0; i < this.field.actions.length; i++){
      if(this.field.actions[i].type == actions.MOVE){
        for(let j = 0; j < this.field.agents.length; j++){
          if(this.field.agents[j].x == this.field.actions[i].x &&
            this.field.agents[j].y == this.field.actions[i].y &&
            this.field.agents[j].lastActionType != actions.MOVE){
              this.field.actions[i].conflict = true;
              conflictCount+=2;
          }

        }
      }
    }


    //コンフリクトが発生した場所に対する行動にもコンフリクトを立てる
    for(let i = 0; i < this.field.actions.length; i++){
      //コンフリクトしたアクションの座標と、行動先の座標が一致したアクションにコンフリクト
      //処理を移動のみに限定
      if(this.field.actions[i].conflict &&
        this.field.actions[i].type == actions.MOVE){
        const originalX = this.field.actions[i].moveSource[0];
        const originalY = this.field.actions[i].moveSource[1];
        for(let j = 0; j < this.field.actions.length; j++){
          if(this.field.actions[j].x ==  originalX &&
            this.field.actions[j].y ==  originalY &&
            this.field.actions[j].type != actions.NONE){
              this.field.actions[j].conflict = true;
              conflictCount+=2;
          }
        }
      }
    }


    message += conflictCount/2 + "件の競合が発生しました"

    document.getElementById("message").innerHTML = message;

    let tmp_data = JSON.parse(JSON.stringify(this.field.backup));

    this.field.tiles = tmp_data.field.tiles;
    this.field.agents = tmp_data.field.agents;

    //コンフリクト起こしていないアクションを適用
    for(let i = 0; i < this.field.actions.length; i++){
      if(!this.field.actions[i].conflict){
        let x = this.field.actions[i].x;
        let y = this.field.actions[i].y;
        let playerIndex = this.field.actions[i].playerIndex;
        let agentId = this.field.actions[i].agentId;
        if(this.field.actions[i].type == actions.PUT){
          this.put(x, y, playerIndex, turnNumber, false);
        }
        if(this.field.actions[i].type == actions.MOVE){
          this.move(x, y, turnNumber, playerIndex, agentId, this.field.actions[i].moveSource, false, true);
        }
        if(this.field.actions[i].type == actions.REMOVE){
          this._selectRemove(x, y, playerIndex, turnNumber, agentId, false);
        }
      }
    }

    //REMOVEしたときにエージェントが移動したますの壁を排除
    for(let i = 0; i < this.field.actions.length; i++){
      let x = this.field.actions[i].x;
      let y = this.field.actions[i].y;
      if(this.field.actions[i].type == actions.REMOVE){
        for(let j = 0; j < this.field.actions.length; j++){
          if(this.field.actions[j].type == actions.MOVE &&
            !this.field.actions[j].conflict){
            if(this.field.actions[j].moveSource[0] == x &&
              this.field.actions[j].moveSource[1] == y)
              this.field.tiles[y][x] = fieldNumber.NONE;
          }
        }
      }
    }

    //fieldNumberにRemovingタイプが指定されているのが残っていたらWallに変更
    for(let i = 0; i < this.w; i++){
      for(let j = 0; j < this.h; j++){
        if(this.field.tiles[i][j] == fieldNumber.p1RemovingAgent)
          this.field.tiles[i][j] = fieldNumber.p1Agent;
        if(this.field.tiles[i][j] == fieldNumber.p2RemovingAgent)
          this.field.tiles[i][j] = fieldNumber.p2Agent;
      }
    }

    for(let i = 0; i < this.field.agents.length; i++){
      this.field.agents[i].lastActionType = actions.NONE;
    }

    this.fillArea();

    this.field.override()
  }

  updateOperatingMode(operatingMode){
    this.operatingMode = operatingMode;
  }

  //排除を行うエージェントを選択して実効
  selectRemoveExecAgent(x, y, playerIndex, turnNumber, agentId = null, isActionAppend = true){
    if(playerIndex == 0){
      if(this.field.tiles[y][x] != fieldNumber.p1Agent){
        this.operatingMode = actions.REMOVE;
        return false;
      }
    }
    if(playerIndex == 1){
      if(this.field.tiles[y][x] != fieldNumber.p2Agent){
        this.operatingMode = actions.REMOVE;
        return false;
      }
    }

    let agentIndex = this.field.agentIndex(x, y, playerIndex);

    if(agentId != null)
      agentIndex = this.field.agentIndexFromId(agentId);

    //排除できる
    let action = new Action(this.field.agents[agentIndex].agentId, actions.REMOVE, this.removeTarget[0], this.removeTarget[1], playerIndex);
    if(isActionAppend)
      this.field.appendAction(action);

    let agent = this.field.agents[agentIndex];
    agent.lastActionTurn = turnNumber;

    this._remove(this.removeTarget[0], this.removeTarget[1]);

    this.resetAllTileColor();
    this.operatingMode = actions.REMOVE;
    return true;
  }

  //排除を行うエージェントを選択して実効
  _selectRemove(x, y, playerIndex, turnNumber, agentId){
    let agentIndex = this.field.agentIndexFromId(agentId);

    let agent = this.field.agents[agentIndex];
    agent.lastActionTurn = turnNumber;

    this._remove(x, y);

    this.resetAllTileColor();
    return true;
  }

  //排除可能判定が終わって複数エージェントが対象だった場合にUI表示
  showCanRemoveExecAgentArea(x, y, playerIndex){
    for(let i = -1; i < 2; i++){
      for(let j = -1; j < 2; j++){
        if(!(i == 0 && j == 0)){
          if(playerIndex == 0){
            if(this.field.tiles[y+j][x+i] == fieldNumber.p1Agent){
              this.setTiledColor(y+j, x+i, colors.suggestArea);
            }
          }
          if(playerIndex == 1){
            if(this.field.tiles[y+j][x+i] == fieldNumber.p2Agent){
              this.setTiledColor(y+j, x+i, colors.suggestArea);
            }
          }
        }
      }
    }
  }

  //排除実効
  remove(x, y, playerIndex, turnNumber, isActionAppend = true){
    //周りの未操作エージェントが一つならすぐに排除
    //複数なら排除担当選択モードに以降
    if(!this.canRemove(x, y, playerIndex, turnNumber)) return false;
    if(this.numberOfAroundNoOperatingAgents(x, y, playerIndex, turnNumber) == 1){
      //アクション内容のセット
      let agentIndex = this.field.agentIndex(this.tmpAgent[0], this.tmpAgent[1], playerIndex);
      let action = new Action(this.field.agents[agentIndex].agentId, actions.REMOVE, x, y, playerIndex);
      if(isActionAppend)
        this.field.appendAction(action);

      let agent = this.field.agents[agentIndex];
      agent.lastActionTurn = turnNumber;
      this.field.backup.field.agents[agentIndex].lastActionType = actions.REMOVE;


      this._remove(x, y);

      this.resetAllTileColor();
      return true;
    }
    else if(this.numberOfAroundNoOperatingAgents(x, y, playerIndex, turnNumber) > 1){
      this.removeTarget = [x, y];
      this.operatingMode = actions.REMOVEAGENTSELECT;
      this.showCanRemoveExecAgentArea(x, y, playerIndex);
      return true;
    }
    return false;
  }

  _remove(x, y){
    //エージェントのマス以外の排除
    if(this.field.tiles[y][x] != fieldNumber.p1Agent &&
      this.field.tiles[y][x] != fieldNumber.p2Agent
      )
    {
      this.field.tiles[y][x] = fieldNumber.NONE;
    }
    //エージェントがいるマスへの排除
    else if(this.field.tiles[y][x] == fieldNumber.p1Agent)
    {
      this.field.tiles[y][x] = fieldNumber.p1RemovingAgent;
    }
    else if(this.field.tiles[y][x] == fieldNumber.p2Agent)
    {
      this.field.tiles[y][x] = fieldNumber.p2RemovingAgent;
    }
  }

  //カーソルのあったますが排除可能か表示
  showCanRemoveArea(x, y, playerIndex, turnNumber){
    if(!this.canRemove(x, y, playerIndex, turnNumber)) return;
      this.setTiledColor(y, x, colors.suggestPoint);
  }

  //排除できるか判定
  canRemove(x, y, playerIndex, turnNumber){
    if(this.field.tiles[y][x] == fieldNumber.p1Area ||
      this.field.tiles[y][x] == fieldNumber.p2Area ||
      this.field.tiles[y][x] == fieldNumber.NONE
      )
      return false;
    for(let i = -1; i < 2; i++){
      for(let j = -1; j < 2; j++){
        if(!(i == 0 && j == 0)){
          let agentIndex = this.field.agentIndex(x+i, y+j, playerIndex);
          if(agentIndex >= 0){
            if(this.field.agents[agentIndex].playerIndex == playerIndex &&
              this.field.agents[agentIndex].lastActionTurn != turnNumber)
              return true;
          }
        }
      }
    }
    return false;
  }

  //周りの未操作エージェントの数
  numberOfAroundNoOperatingAgents(x, y, playerIndex, turnNumber){
    let count = 0;
    for(let i = -1; i < 2; i++){
      for(let j = -1; j < 2; j++){
        if(!(i == 0 && j == 0)){
          let agentIndex = this.field.agentIndex(x+i, y+j, playerIndex);
          if(agentIndex >= 0){
            if(this.field.agents[agentIndex].playerIndex == playerIndex &&
              this.field.agents[agentIndex].lastActionTurn != turnNumber){
                count++;
                this.tmpAgent = [x+i, y+j];
              }
          }
        }
      }
    }
    return count;
  }

  //移動元のエージェントを選択
  selectMoveSource(x, y, playerIndex, turnNumber){
    if(!this.canMoveSource(x, y, playerIndex, turnNumber)) return false;
    let agentIndex = this.field.agentIndex(x, y, playerIndex);
    if(agentIndex < 0) return false;
    this.selectAgentId = this.field.agents[agentIndex].agentId;
    this.operatingMode = actions.MOVING;
    return true;
  }

  //移動処理実効
  move(x, y, turnNumber, playerIndex, agentId = null, moveSource = null, isActionAppend = true, ignoreEnemyWall = false){
    let agentIndex = this.field.agentIndexFromId(this.selectAgentId);

    if(agentId != null){
      agentIndex = this.field.agentIndexFromId(agentId);
    }

    if(!this.canMove(x, y, playerIndex, agentIndex, ignoreEnemyWall)){
      this.operatingMode = actions.MOVE;
      //console.log("canMove false")
      return　false;
    }
    let position = [this.field.agents[agentIndex].x, this.field.agents[agentIndex].y]
    if(moveSource!=null)
      position = moveSource;
    let action = new Action(this.field.agents[agentIndex].agentId, actions.MOVE, x, y, playerIndex, position);
    if(isActionAppend)
      this.field.appendAction(action);

    let agent = this.field.agents[agentIndex];
    if(agent.playerIndex == 0){
      //敵エージェントに置き換わっていたら変えない
      if(this.field.tiles[agent.y][agent.x] != fieldNumber.p2Agent)
        this.field.tiles[agent.y][agent.x] = fieldNumber.p1Wall;
      this.field.tiles[y][x] = fieldNumber.p1Agent;
    }
    if(agent.playerIndex == 1){
      //敵エージェントに置き換わっていたら変えない
      if(this.field.tiles[agent.y][agent.x] != fieldNumber.p1Agent)
        this.field.tiles[agent.y][agent.x] = fieldNumber.p2Wall;
      this.field.tiles[y][x] = fieldNumber.p2Agent;
    }

    if(this.field.tiles[agent.y][agent.x] == fieldNumber.p1RemovingAgent||
      this.field.tiles[agent.y][agent.x] == fieldNumber.p2RemovingAgent)
    {
      this.field.tiles[agent.y][agent.x] = fieldNumber.NONE;
    }

    this.field.agents[agentIndex].x = x;
    this.field.agents[agentIndex].y = y;
    this.field.backup.field.agents[agentIndex].lastActionType = actions.MOVE;
    this.field.agents[agentIndex].lastActionTurn = turnNumber;

    this.operatingMode = actions.MOVE;
    this.resetAllTileColor();

    return true;
  }

  //移動可能なエリアを表示
  showCanMoveArea(x, y, playerIndex, turnNumber){
    let agentIndex = this.field.agentIndex(x, y, playerIndex);
    if(!this.canMoveSource(x, y, playerIndex, turnNumber)) return;
    for(let i = -1; i < 2; i++){
      for(let j = -1; j < 2; j++){
        if(this.canMove(x+i, y+j, playerIndex, agentIndex)){
          if(i == 0 && j == 0)
            this.setTiledColor(y, x, colors.suggestPoint);
          else
            this.setTiledColor(y+j, x+i, colors.suggestArea);
        }
      }
    }
  }

  //移動先になりうるか
  canMove(x, y, playerIndex, agentIndex, ignoreEnemyWall = false){
    if(x >= this.w || y >= this.h || x < 0 || y < 0) return false;
    if(!(this.field.agents[agentIndex].x-1 <= x &&
      this.field.agents[agentIndex].y-1 <= y &&
      this.field.agents[agentIndex].x+1 >= x &&
      this.field.agents[agentIndex].y+1 >= y)) return false;
    //そのターン内で排除済みのマスには移動できない(自分のエージェントどうしで競合おこすため)
    for(let i = 0; i<this.field.actions.length; i++){
      if(this.field.actions[i].type == actions.REMOVE &&
        this.field.actions[i].playerIndex == playerIndex &&
        this.field.actions[i].x == x &&
        this.field.actions[i].y == y)
        return false;
    }
    if(this.field.tiles[y][x] == fieldNumber.NONE ||
        this.field.tiles[y][x] == fieldNumber.p1Area ||
        this.field.tiles[y][x] == fieldNumber.p2Area) return true;
    if(playerIndex == 0){
      if(this.field.tiles[y][x] == fieldNumber.p1Wall ||
        //エージェント入れ替わ理の場合敵の壁を無視
        (this.field.tiles[y][x] == fieldNumber.p2Wall && ignoreEnemyWall)||
        this.field.tiles[y][x] == fieldNumber.p2Agent)
        return true;
    }
    if(playerIndex == 1){
      if(this.field.tiles[y][x] == fieldNumber.p2Wall ||
        (this.field.tiles[y][x] == fieldNumber.p1Wall && ignoreEnemyWall)||
        this.field.tiles[y][x] == fieldNumber.p1Agent)
        return true;
    }
    return false;
  }

  //移動元になりうるか
  canMoveSource(x, y, playerIndex, turnNumber){
    //すでに操作したエージェントはfalse
    let agentIndex = this.field.agentIndex(x, y, playerIndex);
    if(agentIndex < 0) return false;
    if(this.field.agents[agentIndex].lastActionTurn == turnNumber) return false;

    if(playerIndex == 0){
      if(this.field.tiles[y][x] == fieldNumber.p1Agent ||
          this.field.tiles[y][x] == fieldNumber.p1RemovingAgent)
        return true;
    }
    if(playerIndex == 1){
      if(this.field.tiles[y][x] == fieldNumber.p2Agent ||
          this.field.tiles[y][x] == fieldNumber.p2RemovingAgent)
        return true;
    }
    return false;
  }

  put(x, y, playerIndex, turnNumber, isActionAppend = true){
    if(this.canPut(x, y, playerIndex)){
      this.field.putAgent(x, y, playerIndex, turnNumber);
      let action = new Action(this.field.agentId(x, y, playerIndex), actions.PUT, x, y, playerIndex);
      if(isActionAppend)
        this.field.appendAction(action);
      if(playerIndex == 0){
        this.field.tiles[y][x] = fieldNumber.p1Agent;
      }
      if(playerIndex == 1){
        this.field.tiles[y][x] = fieldNumber.p2Agent;
      }
      this.resetAllTileColor();
      return true;
    }
    return false;
  }

  showCanPutArea(x, y, playerIndex){
    if(this.canPut(x, y, playerIndex))
      this.setTiledColor(y, x, colors.suggestPoint);
  }

  //PUT可能か判定
  canPut(x, y, playerIndex){
    if(playerIndex == 0){
      if(this.field.numberOfAgents(0) >= nAgent)
        return false;
      if(this.field.tiles[y][x] != fieldNumber.p1Agent &&
         this.field.tiles[y][x] != fieldNumber.p2Agent &&
         this.field.tiles[y][x] != fieldNumber.p2Wall)
        return true;
    }
    if(playerIndex == 1){
      if(this.field.numberOfAgents(1) >= nAgent)
        return false;
      if(this.field.tiles[y][x] != fieldNumber.p2Agent &&
         this.field.tiles[y][x] != fieldNumber.p1Agent &&
         this.field.tiles[y][x] != fieldNumber.p1Wall)
        return true;
    }
    return false;
  }

  //フィールドの初回生成
  createField(onClick, onMouseMove, onMouseOut){
    var table = document.createElement('table');
    table.id = fieldTableId;
    table.className = 'field';
    table.onclick = onClick;
    table.onmousemove = onMouseMove;
    table.onmouseout = onMouseOut;
    for (var i = 0; i < this.h; i++) {
      var tr = document.createElement('tr');
      for (var j = 0; j < this.w; j++) {
        var td = document.createElement('td');
        td.textContent = this.points[i][j];
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    document.getElementById(parentElementId).appendChild(table);

    this.resetAllTileColor();
  }

  resetAllTileColor(){
    for (var i = 0; i < this.h; i++) {
      for (var j = 0; j < this.w; j++) {
        this.setFieldTiledColor(i, j, this.field.tiles[i][j]);
      }
    }
  }

  //フィールドの色を設定
  setFieldTiledColor(rowIndex, columnIndex, fieldTiledNumber){
    var color = "white";
    switch(fieldTiledNumber){
      case fieldNumber.p1Agent:
        color = colors.p1Agent;
        break;
      case fieldNumber.p1Wall:
        color = colors.p1Wall;
        break;
      case fieldNumber.p1Area:
        color = colors.p1Area;
        break;
      case fieldNumber.p2Agent:
        color = colors.p2Agent;
        break;
      case fieldNumber.p2Wall:
        color = colors.p2Wall;
        break;
      case fieldNumber.p2Area:
        color = colors.p2Area;
        break;
    }
    this.setTiledColor(rowIndex, columnIndex, color);
  }

  //フィールドに色を塗る
  setTiledColor(rowIndex, columnIndex, color){
    var row = document.getElementById(fieldTableId).rows.item(rowIndex);
    if(row == null) return;
    var cell = row.cells.item(columnIndex);
    if(cell == null) return;
    cell.style.backgroundColor = color;

    if(this.field.isAgent(columnIndex, rowIndex)){
      cell.id = "agent_cell";
    }
    else{
      cell.id = "";
    }
  }
}


class Agent{
  constructor(uuid, agentId, playerIndex){
    this.x = -1;
    this.y = -1;
    this.playerUuid = uuid;
    this.agentId = agentId;
    this.playerIndex = playerIndex;
    this.lastActionTurn = 0;
    this.lastActionType = null;
  }

  isOnBoard(){
    return this.x != -1;
  }
}

class Action{
  constructor(agentId, type, x, y, playerIndex, moveSource = null){
    this.agentId = agentId;
    this.type = type;
    this.x = x;
    this.y = y;
    this.moveSource = moveSource;
    this.playerIndex = playerIndex;
    this.conflict = false;
  }
}

class Player{
  constructor(uuid, name){
    this.uuid = uuid;
    this.name = name;
    this.actions = [];
  }

  setActions(){
    this.actions = actions;
  }
}

class Kakomimasu{
  constructor(){
    this.board = null;
    this.endTurn = 0;
    this.turnNumber = 1;
    this.turnPlayerIndex = 0;
    this.gaming = false;
    this.ending = false;
  }

  appendBoard(board){
    this.board = board;
  }

  startGame(){
    this.gaming = true;
  }

  endGame(){
    this.gaming = false;
    this.ending = true;
    document.getElementById("turnNumber").innerHTML = "END";
  }

  createField(onClick, onMouseMove, onMouseOut){
    this.board.createField(onClick, onMouseMove, onMouseOut);
  }

  nextTurn(p1, p2){
    document.getElementById("mode").innerHTML = "NONE";
    this.board.updateOperatingMode(actions.NONE);

    if(this.turnPlayerIndex == 0){
      document.getElementById("turnPlayerName").innerHTML = p2.name + "(赤)";
      document.getElementById("message").innerHTML = "次のターン";
      this.board.field.restoreBackup();
      this.board.resetAllTileColor();
      this.turnPlayerIndex = 1
    }
    else if(this.turnPlayerIndex == 1){
      document.getElementById("turnPlayerName").innerHTML = "前回ターンの最終状態";
      document.getElementById("message").innerHTML = "前回ターンの最終状態";
      this.board.field.restoreBackup();
      this.board.resetAllTileColor();
      this.turnPlayerIndex = 2
    }
    else if(this.turnPlayerIndex == 2){
      document.getElementById("turnPlayerName").innerHTML = p1.name + "(青)";
      this.board.checkConflict(this.turnNumber);
      this.board.resetAllTileColor();
      this.turnNumber ++;
      this.turnPlayerIndex = 0
    }
    //this.turnPlayerIndex == 0 ? this.turnPlayerIndex = 1 : this.turnPlayerIndex = 0;
    document.getElementById("turnNumber").innerHTML = endTurn - this.turnNumber + 1;
    if(this.turnNumber > endTurn){
      this.endGame();
    }
  }
}