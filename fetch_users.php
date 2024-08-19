<?php
$conn = new mysqli('localhost', 'root', '', 'blacklove');

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$result = $conn->query("SELECT * FROM users");

$users = array();

while($row = $result->fetch_assoc()) {
    $users[] = $row;
}

echo json_encode($users);
?>
