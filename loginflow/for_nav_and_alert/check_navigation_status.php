<?php
// Database connection
$conn = new mysqli("localhost", "root", "admin", "puppeteer_data");

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Email settings
$emailTo = "siddharth.intern@notionpress.com"; // Replace with your email
$subject = "Navigation Alert";
$headers = "From: alert@yourdomain.com";

// Fetch the latest flow entry
$result = $conn->query("
    SELECT flow_id, 
           home_page_time, 
           login_page_time, 
           dashboard_page_time
    FROM navigation_flows 
    ORDER BY flow_id DESC 
    LIMIT 1
");

if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();

    // Check if all values are inserted properly
    $errors = [];
    if (is_null($row['home_page_time'])) {
        $errors[] = "Home Page time is missing. The script may have failed to navigate to the Home Page.";
    }
    if (is_null($row['login_page_time'])) {
        $errors[] = "Login Page time is missing. The script may have failed to find the Login button or navigate to the Login Page.";
    }
    if (is_null($row['dashboard_page_time'])) {
        $errors[] = "Dashboard Page time is missing. The script may have failed to log in or find the Dashboard selector.";
    }

    // Check if any navigation time exceeds 10 seconds
    if (!is_null($row['home_page_time']) && $row['home_page_time'] > 10) {
        $errors[] = "Home Page navigation time exceeds 10 seconds.";
    }
    if (!is_null($row['login_page_time']) && $row['login_page_time'] > 10) {
        $errors[] = "Login Page navigation time exceeds 10 seconds.";
    }
    if (!is_null($row['dashboard_page_time']) && $row['dashboard_page_time'] > 10) {
        $errors[] = "Dashboard Page navigation time exceeds 10 seconds.";
    }

    // If there are any errors, send an alert email
    if (!empty($errors)) {
        $message = "The following issues were detected:\n\n" . implode("\n", $errors);
        mail($emailTo, $subject, $message, $headers);
        echo "Alert sent: " . nl2br($message);
    } else {
        echo "All checks passed. No issues detected.";
    }
} else {
    // No entries found in the database
    $message = "No navigation data found. The script may have failed to run or encountered an error.";
    mail($emailTo, $subject, $message, $headers);
    echo "Alert sent: " . nl2br($message);
}

$conn->close();
?>
