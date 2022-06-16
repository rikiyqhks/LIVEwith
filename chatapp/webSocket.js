$(function() {

  let socket = io.connect();
  const messages = document.getElementById("messages");

  function doReload() {
 
    // reloadメソッドによりページをリロード
    window.location.reload();

  }

  //接続確認
  //サーバーがクライアントとの接続を確認すると、クライアントで"connect"イベントが発生
  socket.on("connect",function() {
    
    // サイトに接続している人数のカウント
    socket.on("count", function(data) {

      // htmlに表示
      $("#count").text(data);

    });

    // クライアントサイドからメッセージを送信した時の処理
    $("#comment-form").on("submit", (e) => {

      // submitしてもページが更新されないようにする
      e.preventDefault();

      // メッセージ内容の取得
      let text = $("#chat").val();
      // 名前の取得
      let name = $("#input-name").val();
      // ルームIDの取得
      let roomid = $("#input-roomid").val();

      // 送るメッセージのカスタム
      let message = " ( " + name + " の発言 ) " + text;

      // 変数objに連想配列でメッセージとルームIDを紐づけ
      let obj = {message: message, roomid: roomid};
      // JSONエンコード（要するにzipファイル化みたいな解釈）して複数の情報をサーバーサイドに送る
      let json = JSON.stringify(obj);

      // "chat message"キーと共に名前とメッセージ内容をサーバーサイドに送る
      // メッセージ内容を参加中の部屋のみに送信する処理
      socket.emit("chat message", json);

      // 送信後、フォームを空にする
      $("#chat").val("");

      // 引数のリセット
      return false;

    });

    // メッセージをサーバーサイドから受信したときの処理
    socket.on("chat message", (msg) => {

      // 現在時刻の取得
      let now = new Date();

      // xxxx年xx月xx日xx時xx分xx秒 の細かい表示設定
      let timelog = "[ " + now.getFullYear() + "-" + now.getMonth() + "/" + now.getDate() + " " + 
                    now.getHours() + "時" + now.getMinutes() + "分" + now.getSeconds() + "秒 ]";

      // メッセージを送信した時にエレメントを生成する
      let item = document.createElement("li");
      item.textContent = timelog + msg;
      messages.appendChild(item);
      window.scrollTo(0, document.body.scrollHeight);

    });

  });

  // クライアントサイドからルーム接続をリクエストした時の処理
  $("#room-form").on("submit", (e) => {

    // submitしてもページが更新されないようにする
    e.preventDefault();

    // 名前の取得
    let name = $("#input-name").val();
    // ルームIDの取得
    let roomid = $("#input-roomid").val();
    // 連想配列で名前と参加する部屋を紐づけする
    let userInfo = {name: name, roomid: roomid};
    let userDataJson = JSON.stringify(userInfo);

    socket.on("people", (data) => {

      // 部屋の人数
      $("#is-joinNum").text(parseInt(data.length));

      // 部屋にいる人の名前を表示
        $("#detail").html("部屋にいる人:<br>" + data);

    })

    // 上記のデータをサーバー側に送る
    socket.emit("userInfo", userDataJson);

    // 参加する部屋に同じ名前のユーザーが存在しない場合の処理
    socket.on("userInfo", (SQLjson) => {

      // デコード
      let SQLData = JSON.parse(SQLjson)

      // 検証モードでのデバッグ
      console.log(SQLData.members);

      // 部屋で自分の名前を表示
      $("#namespan").text(name);

      // 入力した名前とルームIDをサーバーサイドに送る
      let obj = {name: name, roomid: roomid};
      let json = JSON.stringify(obj);
      socket.emit("name-roomid", json);
  
      // 入室した時のメッセージをサーバーサイドから受け取った時の処理
      socket.on("join message", (json) => {

        socket.on("people", (data) => {

          // 部屋の人数
          $("#is-joinNum").text(parseInt(data.length));

          // 部屋にいる人の名前を表示
            $("#detail").html("部屋にいる人:<br>" + data);

        })

        // デコード
        let obj = JSON.parse(json);

        // 参加中のルームIDの表示
        $("#roomidspan").html(obj.roomid);

        // 現在時刻の取得
        let now = new Date();
  
        // xxxx年xx月xx日xx時xx分xx秒 の細かい表示設定
        let timelog = "[ " + now.getFullYear() + "-" + now.getMonth() + "/" + now.getDate() + " " + 
                      now.getHours() + "時" + now.getMinutes() + "分" + now.getSeconds() + "秒 ]";
        
        // メッセージを送信した時にエレメントを生成する
        let item = document.createElement("li");
        item.textContent = timelog + obj.message;
        item.style.color = "green";
        messages.appendChild(item);
        window.scrollTo(0, document.body.scrollHeight);
  
      });
  
      // チャット部屋のレイアウトを表示
      $("#hidden").css("display", "block");
      // トップページのレイアウトを非表示
      $("#block").css("display", "none");

    });

    // 既に同じ名前が参加しようとしている部屋に存在する場合の処理
    // 機能してない
    socket.on("err", (userInfo) => {

      // OKボタンを押したときの処理
      if (!alert("現在既に " + userInfo.name + " が存在している為、別の名前でお試しください。")) {

        // 瞬間的なリロードを挟んで情報のリセット
        setTimeout(doReload, 1);

      }

    });

  });

  // クライアントサイドからルーム接続の切断をリクエストした時の処理
  $("#leave-form").on("submit", (e) => {

    // submitしてもページが更新されないようにする
    e.preventDefault();

    // 名前の取得
    let name = $("#input-name").val();
    // ルームIDの取得
    let roomid = $("#input-roomid").val();
    // 連想配列で名前と参加する部屋を紐づけする
    let userInfo = {name: name, roomid: roomid};
    // JSONエンコード
    let json = JSON.stringify(userInfo);

    // JSONをサーバーサイドに送る
    socket.emit("leave", json);

    // チャット部屋のレイアウトを非表示
    $("#hidden").css("display", "none");
    // トップページのレイアウトを表示
    $("#block").css("display", "block");

    // 瞬間的なリロードを挟んで情報のリセット
    setTimeout(doReload, 1);

    // トップページのinput内容をリセット
    $("#input-name").val("");
    $("#input-roomid").val("");

    return false;

  });

  // 退室した時のメッセージをサーバーサイドから受け取った時の処理
  socket.on("leave message", (leavemsg) => {

    socket.on("people", (data) => {

      // 部屋の人数
      $("#is-joinNum").text(parseInt(data.length));

      // 部屋にいる人の名前を表示
      $("#detail").html("部屋にいる人:<br>" + data);

    })

    // 現在時刻の取得
    let now = new Date();

    // xxxx年xx月xx日xx時xx分xx秒 の細かい表示設定
    let timelog = "[ " + now.getFullYear() + "-" + now.getMonth() + "/" + now.getDate() + " " + 
                  now.getHours() + "時" + now.getMinutes() + "分" + now.getSeconds() + "秒 ]";
    
    // メッセージを送信した時にエレメントを生成する
    let item = document.createElement("li");
    item.textContent = timelog + leavemsg;
    item.style.color = "red";
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);

  });

});