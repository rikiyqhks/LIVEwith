// コンソールに表示する文字の色
var red     = "\u001b[31m";
var green   = "\u001b[32m";
var blue    = "\u001b[34m";
var magenta = "\u001b[35m";
var cyan    = "\u001b[36m";

var reset   = "\u001b[0m";


// フレームワーク "express" をrequireで読み込み
const express = require("express");

// 変数appにexpress関数を代入。
const app = express();

// helmetモジュールの読み込み
const helmet = require("helmet");

// 変数httpに "http" をrequireで読み込んで代入
const http = require("http");

// 変数serverにhttpで作成しexpressで立ち上げたものを代入
const server = http.createServer(app);

// 変数Serverに "webSocket" をrequireで読み込み
const { Server } = require("socket.io");

// 変数ioにServerクラスを代入
const io = new Server(server);

// child_processモジュールの読み込み
const spawn = require("child_process").spawn;

// 部屋のメンバーを管理するための配列の作成
const memberList = [];

// 特定の部屋に依存の名前を返す為の保存領域
let exportMember = [];

// expressの実行。
app.get("/", (req, res) => {

    // chatappファイル全体を読み込む
    app.use(express.static("chatapp"));

    // X-XSS攻撃の対策
    app.use(helmet.xssFilter());
    //オプション(noCache)を有効にする
    app.use(helmet({ noCache: true }))

    app.use(helmet.frameguard({ action: 'SAMEORIGIN' }));

    // chatappのindex.htmlの表示をレスポンスとして返す
    res.sendFile(__dirname + "/chatapp/index.html");

});

// サイト接続人数
let count = 0;

// 接続されたら実行。
io.on("connection", (socket) => {

    // コンソールログにメッセージを表示
    console.log("[server log]" + cyan + " 新規ユーザーがサイトに接続しました。" + reset);

    // 接続人数をカウント
    count++;
    // クライアントサイドに接続人数を渡す
    io.emit("count", count);

    // クライアントサイドで入力したユーザーの名前とルームIDを受け取った時の処理
    socket.on("userInfo", (userDataJson) => {

        // デコード
        let obj = JSON.parse(userDataJson);

        // デフォルトでsuccessを代入
        let event = "success";

        // 配列内の名前検索
        for (let i = 0; i < Object.keys(memberList).length; i++) {

            // 配列内に参加している名前と比較して同じだった場合、エラーを返す
            if (memberList[i].name == obj.name) {

                // 名前が存在している場合には、エラーを送る
                socket.emit("err", obj);
                event = "error";
                console.log("[server log] 重複した名前が見つかりました。");
                break;

            } else {

                // 処理を続ける
                continue;

            }

        }

        // 名前が存在していない場合
        if (event === "success") {
    
            // クライアントサイドから送られてきた紐づけされた連想配列を配列に挿入
            memberList.push(obj);

            // sql.phpのプロセスの呼び出し
            let php = spawn("php", ["sql.php"]);

            // SQLで動的にデータの管理をする
            let SQLData = {
                roomid: obj.roomid,
                members: memberList.map(key => key["name"])
            };

            php.stdin.write(JSON.stringify(memberList)); // 標準入力としてPHPに渡す
            php.stdin.end(); // PHPの標準入力が完了

            // 正常なデータが受け取れた時の処理
            php.stdout.on("data", function (data) {
                console.log(blue + "/////////////////////////正常/////////////////////////" + reset)
                console.log("")
                console.log("stdout: ", JSON.parse(data));
            });

            // 異常なデータを受け取った時の処理
            php.stderr.on("data", function (data) {
                console.log(red + "/////////////////////////異常/////////////////////////" + reset)
                console.log("")
                console.log("stderr: ", JSON.parse(data));
            });

            // ステータスコードの表示
            php.on("exit", function (code) {
                console.log("[server log]" + green + " phpプロセスが終了しました。: ステータスコード: " + code);
                console.log("")
                console.log(green + "///////////////////////処理完了///////////////////////" + reset)
            });

            let SQLjson = JSON.stringify(SQLData);

            // ユーザー情報をもとに送り返す
            socket.emit("userInfo", SQLjson);

        }

    });

    // "chat message"のキーを受け取った場合の処理
    socket.on("chat message", (json) => {

        // 受け取ったJSONをデコード（解凍）して扱えるようにする
        let obj = JSON.parse(json);

        // 受け取ったメッセージをクライアントサイドに送り返す
        io.to(obj.roomid).emit("chat message", obj.message);

    });

    // 名前とルームIDを受け取った場合の処理
    socket.on("name-roomid", (json) => {

        // デコード
        let obj = JSON.parse(json);
        // そのルームIDの部屋に参加、なかった場合は作成する
        socket.join(obj.roomid);

        exportMember = [];

        for (let i = 0; i < Object.keys(memberList).length; i++) {

            // 配列内に参加しているルームIDと比較して同じだった場合、同一のルームにいる人の名前を取得する
            if (memberList[i].roomid == obj.roomid) {

                // 重複していた時の処理
                if (exportMember.indexOf(memberList[i].name) !== -1) {

                    // 処理を続ける
                    continue;

                } else {

                    // 出力用の配列に入れる
                    exportMember.push(memberList[i].name);
                    continue;
                    
                }

            } else {

                // 処理を続ける
                continue;

            }

        }

        // 部屋の人数をそのルームIDに対して送る
        io.to(obj.roomid).emit("people", exportMember);

        // JSONエンコード
        let message = " " + obj.name + " さんが" + "部屋に入室しました。";
        let sendData = {message: message, roomid: obj.roomid};
        let json_2 = JSON.stringify(sendData);

        // その部屋だけに入室ログを流す -> メッセージ内容をクライアントサイドに送る
        io.to(obj.roomid).emit("join message", json_2);

    });

    // 強制切断されたときに実行
    socket.on("disconnect", () => {

        // サイトから切断したら接続人数を減らす
        console.log("[server log]" + red + " ユーザーがサイトを切断しました。" + reset)
        // 1人減らす
        count--;
        // クライアントサイドに接続人数を渡す
        io.emit("count", count);

    });

    // 部屋から退出する
    socket.on("leave", (json) => {

        // JSONデコード
        let obj = JSON.parse(json);

        exportMember = [];

        for (let i = 0; i < Object.keys(memberList).length; i++) {

            // 配列内に参加しているルームIDと比較して同じだった場合、同一のルームにいる人の名前を取得する
            if (memberList[i].roomid == obj.roomid) {

                // 重複していた時の処理
                if (exportMember.indexOf(memberList[i].name) !== -1) {

                    // 処理を続ける
                    continue;

                } else {

                    // 出力用の配列に入れる
                    exportMember.push(memberList[i].name);
                    continue;
                    
                }

            } else {

                // 処理を続ける
                continue;

            }

        }

        // メッセージのカスタム
        let message = " " + obj.name + " さんが部屋から退室しました。";

        // 名前を順番に検索して配列から削除
        let index = obj.name;
        memberList.some(function(v, i) {

            // 同じ名前が見つかった時の処理
            if (v.name == obj.name) {

                // 配列から削除
                memberList.splice(i, 1);

            }

        });

        console.log(exportMember);

        // 出力用の配列からも削除する
        index = exportMember.indexOf(obj.name);
        exportMember.splice(index, 1);

        // 部屋の人数をそのルームIDに対して送る
        io.to(obj.roomid).emit("people", exportMember);

        // その部屋だけに退室ログを流す -> メッセージ内容をクライアントサイドに送る
        io.to(obj.roomid).emit("leave message", message);

        // 部屋から退室
        socket.leave(obj.roomid);

        // sql.phpのプロセスの呼び出し
        let php = spawn("php", ["sql.php"]);

        php.stdin.write(JSON.stringify(memberList)); // 標準入力としてPHPに渡す
        php.stdin.end(); // PHPの標準入力が完了

        // 正常なデータが受け取れた時の処理
        php.stdout.on("data", function (data) {
            console.log(blue + "/////////////////////////正常/////////////////////////" + reset);
            console.log("")
            console.log("stdout: ", JSON.parse(data));
        });

        // 異常なデータを受け取った時の処理
        php.stderr.on("data", function (data) {
            console.log(red + "/////////////////////////異常/////////////////////////" + reset);
            console.log("")
            console.log("stderr: ", JSON.parse(data));
        });

        // ステータスコードの表示
        php.on("exit", function (code) {
            console.log("[server log]" + green + " phpプロセスが終了しました。: ステータスコード: " + code);
            console.log("")
            console.log("///////////////////////処理完了///////////////////////" + reset);
        });

    });
});

// ポート番号
const PORT = process.env.PORT || 3000;

// 3000番サーバーが立ち上がった場合の処理
server.listen(PORT, () => {

    // コンソールログにメッセージを表示
    console.log("[server log]" + magenta +  " サーバーの起動に成功しました。" + reset);

});