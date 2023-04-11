<?php
require 'database.php';

$message = '';

if (!empty($_POST['email']) && !empty($_POST['password'])) {
  $sql = "INSERT INTO users (email, password) VALUES (:email, :password)";
  $stmt = $conn->prepare($sql);
  $stmt->bindParam(':email',$_POST['email']);
  $password = password_hash($_POST['password'], PASSWORD_BCRYPT);
  $stmt->bindParam(':password',$password);

  if ($stmt->execute()) {
    $message = 'Se a creado un nuevo usuario exitosamente, ya puede iniciar sesion ';
  } else {
    $message = 'Lo sentimos a ocurrido un error al crear su cuenta';
  }
}
?>
<!DOCTYPE html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="utf-8">
    <title>Registro</title>
    <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@1,600&family=Smooch&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="interfaz\css\style.css">
  </head>
  <body>
      <?php require 'parciales/header.php' ?>

    <div class="login-box">
      <img class="avatar" src="interfaz/css/CX.png" alt="Logo de CX"
    </div>

      <?php if (!empty($message)): ?>
          <p><?= $message ?></p>
      <?php endif; ?>

      <h1>Registrarse</h1>



      <form action="signup.php" method="post">
        <input type="text" name="email" placeholder="Ingresa tu Correo">
        <input type="password" name="password" placeholder="Ingresa tu contraseña">
        <input type="submit" value="Enviar">
      </form>

  </body>
</html>
