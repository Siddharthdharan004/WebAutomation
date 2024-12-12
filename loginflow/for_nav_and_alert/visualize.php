<?php
$conn = new mysqli("localhost", "root", "admin", "puppeteer_data");

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Fetch all flows
$result = $conn->query("
    SELECT flow_id, 
           home_page_time, 
           login_page_time, 
           dashboard_page_time, 
           COALESCE(home_page_time, 0) + COALESCE(login_page_time, 0) + COALESCE(dashboard_page_time, 0) AS total_time
    FROM navigation_flows 
    ORDER BY flow_id ASC
");

$data = [];
while ($row = $result->fetch_assoc()) {
    $data[] = $row;
}

$conn->close();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Navigation Times</title>
    <style>
        table {
            border-collapse: collapse;
            width: 100%;
        }
        th, td {
            border: 1px solid black;
            padding: 8px;
            text-align: center;
        }
        th {
            background-color: #f2f2f2;
        }
    </style>
</head>
<body>
    <h1>Navigation Times</h1>
    <table>
        <tr>
            <th>Flow ID</th>
            <th>Home Page</th>
            <th>Login Page</th>
            <th>Dashboard Page</th>
            <th>Total Time (s)</th>
        </tr>
        <?php foreach ($data as $row): ?>
            <tr>
                <td><?= $row['flow_id'] ?></td>
                <td><?= isset($row['home_page_time']) ? $row['home_page_time'] : "-" ?></td>
                <td><?= isset($row['login_page_time']) ? $row['login_page_time'] : "-" ?></td>
                <td><?= isset($row['dashboard_page_time']) ? $row['dashboard_page_time'] : "-" ?></td>
                <td><?= $row['total_time'] > 0 ? $row['total_time'] : "-" ?></td>
            </tr>
        <?php endforeach; ?>
    </table>
</body>
</html>
