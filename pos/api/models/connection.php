<?php

require_once "get.model.php";

class Connection{

	/*=============================================
	Información de la base de datos
	=============================================*/

	static public function infoDatabase(){

		$infoDB = array(

			"host"     => getenv('DB_HOST') ?: 'db',        // 'db' en Docker
			"database" => getenv('DB_NAME') ?: 'pos',
			"user"     => getenv('DB_USER') ?: 'root',
			"pass"     => getenv('DB_PASS') ?: 'root'

		);

		return $infoDB;

	}

	/*=============================================
	APIKEY
	=============================================*/

	static public function apikey(){

		return "gdfhdfhsdfyeryr34646fhdfy4564t3456fhgdy";

	}

	/*=============================================
	Acceso público
	=============================================*/
	
	static public function publicAccess(){

		$tables = [""];

		return $tables;

	}

	/*=============================================
	Conexión a la base de datos
	=============================================*/

	static public function connect(){


		try{

			$db   = Connection::infoDatabase();
			$link = new PDO(
				"mysql:host=".$db["host"].";dbname=".$db["database"].";charset=utf8mb4",
				$db["user"],
				$db["pass"],
				[
					PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
					PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_OBJ,
				]
			);

		}catch(PDOException $e){

			die("Error: ".$e->getMessage());

		}

		return $link;

	}

	/*=============================================
	Validar existencia de una tabla en la bd
	=============================================*/

	static public function getColumnsData($table, $columns){

		/*=============================================
		Traer el nombre de la base de datos
		=============================================*/

		$database = Connection::infoDatabase()["database"];

		/*=============================================
		Traer todas las columnas de una tabla
		=============================================*/

		$validate = Connection::connect()
		->query("SELECT COLUMN_NAME AS item FROM information_schema.columns WHERE table_schema = '$database' AND table_name = '$table'")
		->fetchAll(PDO::FETCH_OBJ);

		/*=============================================
		Validamos existencia de la tabla
		=============================================*/

		if(empty($validate)){

			return null;

		}else{

			/*=============================================
			Ajuste de selección de columnas globales
			=============================================*/

			if($columns[0] == "*"){
				
				array_shift($columns);

			}

			/*=============================================
			Validamos existencia de columnas
			=============================================*/

			$sum = 0;
				
			foreach ($validate as $key => $value) {

				$sum += in_array($value->item, $columns);	
				
						
			}



			return $sum == count($columns) ? $validate : null;
			
			
			
		}

	}

	/*=============================================
	Generar Token de Autenticación
	=============================================*/

	static public function jwt($id, $email){

		$time = time();

		$token = array(

			"iat" =>  $time,//Tiempo en que inicia el token
			"exp" => $time + (60*60*24), // Tiempo en que expirará el token (1 día)
			"data" => [

				"id" => $id,
				"email" => $email
			]

		);

		return $token;
	}

	/*=============================================
	Validar el token de seguridad
	=============================================*/

	static public function tokenValidate($token,$table,$suffix){

		/*=============================================
		Traemos el usuario de acuerdo al token
		=============================================*/
		$user = GetModel::getDataFilter($table, "token_exp_".$suffix, "token_".$suffix, $token, null,null,null,null);
		
		if(!empty($user)){

			/*=============================================
			Validamos que el token no haya expirado
			=============================================*/	

			$time = time();

			if($time < $user[0]->{"token_exp_".$suffix}){

				return "ok";

			}else{

				return "expired";
			}

		}else{

			return "no-auth";

		}

	}

}