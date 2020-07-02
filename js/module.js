function getRandomInt(min, max, positiveRatio) {
  if(probability(positiveRatio)){
    min = Math.ceil(0);
    max = Math.floor(max) + 1;
    return Math.floor(Math.random() * (max - min)) + min;
  }else{
    min = Math.ceil(min);
    max = Math.floor(0);
    return Math.floor(Math.random() * (max - min)) + min;
  }
}

function probability(int){
  const random = Math.random() * 100
  return random < int ? true : false;
}

function getUrlQueries() {
  var queryStr = window.location.search.slice(1);  // 文頭?を除外
      queries = {};

  // クエリがない場合は空のオブジェクトを返す
  if (!queryStr) {
    return queries;
  }

  // クエリ文字列を & で分割して処理
  queryStr.split('&').forEach(function(queryStr) {
    // = で分割してkey,valueをオブジェクトに格納
    var queryArr = queryStr.split('=');
    queries[queryArr[0]] = queryArr[1];
  });

  return queries;
}