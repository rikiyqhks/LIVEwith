<?php

// JSONデータを受け取る
$stdin = file_get_contents("php://stdin");

// デコード
$data = json_decode($stdin, true);

// 配列にデータを入れる
$array = print_r($data, true);

// JSONで受け取ったデータをPHPの変数に入れる
// $SQL_roomid = $data["roomid"];
// $SQL_member = current($data["members"]);

// 配列で受け取れているか確認する
if (is_array($data) === false) {

    // 受け取れていなかったらエラーを送信する
    echo json_encode(array(
        "status-message" => "phpの接続に失敗しました",
        "update-message" => "部屋の更新に失敗しました",
        "other-message"  => "フォーマットに誤りがある可能性があります"
    ));
    exit(2); // エラーコード

} else {

    // テキストフォルダで部屋の情報を管理
    // ファイルが存在しなければ作成する
    $path = "chatapp/ROOM_DATA.txt";
    if(!file_exists($path)) {
    touch ($path);
    }

    // ファイルに更新データを上書き保存していく
    $file = fopen("chatapp/ROOM_DATA.txt", "w");
    @fwrite($file, "::部屋の管理ファイル" . PHP_EOL . $array . PHP_EOL);
    fclose($file);
    
    // 受け取れている時は正常に処理を終える
    echo json_encode(array(
        "status-message" => "phpの接続完了",
        "update-message" => "メンバーの更新の完了",
        "other-message"  => "現在の部屋の情報を開示します",
        "SQL-data"       => $data
    ));
    exit(1); // 正常なステータスコード

}

?>