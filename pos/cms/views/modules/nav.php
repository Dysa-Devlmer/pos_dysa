<nav class="navbar navbar-expand-lg navbar-light bg-white border-bottom d-lg-flex justify-content-lg-between">
					
	<div>
		<button class="btn btn-default border-0" id="menu-toggle">
			<i class="bi bi-list"></i>
		</button>
	</div>

	<div class="d-flex">

		<div class="p-2">

			<?php if ($_SESSION["admin"]->id_office_admin > 0): ?>
			

				<span class="badge badge-default backColor small rounded py-2 px-3"><?php echo urldecode($_SESSION["admin"]->title_office) ?></span>

			<?php else: ?>

				<span class="badge badge-default backColor small rounded py-2 px-3">Multi-Sucursal</span>

				
			<?php endif ?>

			<a href="#myProfile" data-bs-toggle="modal" style="color:inherit;">
				<i class="bi bi-person-circle"></i>
				<?php echo urldecode($_SESSION["admin"]->name_admin) ?>
			</a>

		</div>

		<div class="p-2 mx-2">
			
			<a href="/logout" class="text-dark">				
				<i class="bi bi-box-arrow-right"></i>
			</a>

		</div>

	</div>

</nav>