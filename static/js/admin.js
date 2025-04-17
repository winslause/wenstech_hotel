$(document).ready(function() {
    // Sidebar Toggle
    $('.sidebar-toggle').click(function() {
        $('.sidebar').toggleClass('active');
    });

    // Navigation
    $('.sidebar .nav-link').click(function(e) {
        if (!$(this).attr('data-bs-toggle')) {
            e.preventDefault();
            $('.sidebar .nav-link').removeClass('active');
            $(this).addClass('active');
            $('.content-section').addClass('d-none');
            const section = $(this).data('section');
            $(`#${section}`).removeClass('d-none');
            if ($(window).width() < 768) {
                $('.sidebar').removeClass('active');
            }
        }
    });

    // Image Preview
    $('#service_image').change(function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                $('#service_image_preview').attr('src', e.target.result).removeClass('d-none');
            };
            reader.readAsDataURL(file);
        } else {
            $('#service_image_preview').addClass('d-none').attr('src', '');
        }
    });

    // Add Service Form
    $('#addServiceForm').submit(function(e) {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', $('#service_title').val());
        formData.append('description', $('#service_description').val());
        formData.append('price', $('#	service_price').val());
        formData.append('image', $('#service_image')[0].files[0]);
        console.log('Submitting service form');
        $.ajax({
            url: '/admin/add_service',
            type: 'POST',
            data: formData,
            contentType: false,
            processData: false,
            success: function(response) {
                console.log('Service added:', response);
                alert(response.message);
                $('#addServiceModal').modal('hide');
                location.reload(true);
            },
            error: function(xhr) {
                console.error('Error:', xhr.responseJSON);
                alert(xhr.responseJSON.message || 'Error adding service.');
            }
        });
    });

    // Edit Service Form
    $(document).on('click', '.edit-service-btn', function() {
        const id = $(this).data('id');
        const title = $(this).data('title');
        const description = $(this).data('description');
        const price = $(this).data('price');
        const imageUrl = $(this).data('image-url');
        $('#service_id').val(id);
        $('#edit_service_title').val(title);
        $('#edit_service_description').val(description);
        $('#edit_service_price').val(price);
        $('#edit_service_current_image').attr('src', imageUrl || '/static/images/fallback.jpg').removeClass('d-none');
        $('#edit_service_image_preview').addClass('d-none').attr('src', '');
        $('#editServiceModal').modal('show');
    });

    $('#editServiceForm').submit(function(e) {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', $('#edit_service_title').val());
        formData.append('description', $('#edit_service_description').val());
        formData.append('price', $('#edit_service_price').val());
        const imageFile = $('#edit_service_image')[0].files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }
        const serviceId = $('#service_id').val();
        console.log('Submitting edit service form for ID:', serviceId);
        $.ajax({
            url: `/admin/update_service/${serviceId}`,
            type: 'POST',
            data: formData,
            contentType: false,
            processData: false,
            success: function(response) {
                console.log('Service updated:', response);
                alert(response.message);
                $('#editServiceModal').modal('hide');
                location.reload(true);
            },
            error: function(xhr) {
                console.error('Error:', xhr.responseJSON);
                alert(xhr.responseJSON.message || 'Error updating service.');
            }
        });
    });

    // Image Preview for Edit Service
    $('#edit_service_image').change(function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                $('#edit_service_image_preview').attr('src', e.target.result).removeClass('d-none');
                $('#edit_service_current_image').addClass('d-none');
            };
            reader.readAsDataURL(file);
        } else {
            $('#edit_service_image_preview').addClass('d-none').attr('src', '');
            $('#edit_service_current_image').removeClass('d-none');
        }
    });

    // Delete Service
    $(document).on('click', '.delete-service-btn', function() {
        const serviceId = $(this).data('id');
        if (confirm('Are you sure you want to delete this service?')) {
            console.log('Deleting service ID:', serviceId);
            $.ajax({
                url: `/admin/delete_service/${serviceId}`,
                type: 'POST',
                contentType: 'application/json',
                success: function(response) {
                    console.log('Service deleted:', response);
                    alert(response.message);
                    location.reload(true);
                },
                error: function(xhr) {
                    console.error('Error:', xhr.responseJSON);
                    alert(xhr.responseJSON.message || 'Error deleting service.');
                }
            });
        }
    });

    // Add Special Service Form
    $('#addSpecialServiceForm').submit(function(e) {
        e.preventDefault();
        const data = {
            title: $('#special_service_title').val(),
            description: $('#special_service_description').val()
        };
        $.ajax({
            url: '/admin/add_special_service',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                alert(response.message);
                $('#addSpecialServiceModal').modal('hide');
                location.reload();
            },
            error: function(xhr) {
                alert(xhr.responseJSON.message || 'Error adding special service.');
            }
        });
    });

    // Add Meal Form
    $('#addMealForm').submit(function(e) {
        e.preventDefault();
        const price = parseFloat($('#meal_price').val());
        if (isNaN(price) || price <= 0) {
            alert('Please enter a valid price.');
            return;
        }
        const data = {
            name: $('#meal_name').val(),
            description: $('#meal_description').val(),
            price: price
        };
        $.ajax({
            url: '/admin/add_meal',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                alert(response.message);
                $('#addMealModal').modal('hide');
                location.reload();
            },
            error: function(xhr) {
                alert(xhr.responseJSON.message || 'Error adding meal.');
            }
        });
    });

    // Add Table Form
    $('#addTableForm').submit(function(e) {
        e.preventDefault();
        const capacity = parseInt($('#table_capacity').val());
        if (isNaN(capacity) || capacity <= 0) {
            alert('Please enter a valid capacity.');
            return;
        }
        const data = {
            table_number: $('#table_number').val(),
            capacity: capacity
        };
        $.ajax({
            url: '/admin/add_table',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                alert(response.message);
                $('#addTableModal').modal('hide');
                location.reload();
            },
            error: function(xhr) {
                alert(xhr.responseJSON.message || 'Error adding table.');
            }
        });
    });

    // Change Password Form
    $('#changePasswordForm').submit(function(e) {
        e.preventDefault();
        const data = {
            current_password: $('#current_password').val(),
            new_password: $('#new_password').val(),
            confirm_password: $('#confirm_password').val()
        };
        $.ajax({
            url: '/admin/change_password',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                alert(response.message);
                $('#changePasswordModal').modal('hide');
            },
            error: function(xhr) {
                alert(xhr.responseJSON.message || 'Error changing password.');
            }
        });
    });

    // Edit User Form
    $(document).on('click', '.edit-user-btn', function() {
        const id = $(this).data('id');
        const name = $(this).data('name');
        const email = $(this).data('email');
        $('#user_id').val(id);
        $('#user_name').val(name);
        $('#user_email').val(email);
        $('#user_password').val('');
        $('#editUserModal').modal('show');
    });

    $('#editUserForm windows').submit(function(e) {
        e.preventDefault();
        const data = {
            name: $('#user_name').val(),
            email: $('#user_email').val(),
            password: $('#user_password').val() || ''
        };
        const userId = $('#user_id').val();
        $.ajax({
            url: `/admin/update_user/${userId}`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                alert(response.message);
                $('#editUserModal').modal('hide');
                location.reload();
            },
            error: function(xhr) {
                alert(xhr.responseJSON.message || 'Error updating user.');
            }
        });
    });

    // Delete User
    $(document).on('click', '.delete-user-btn', function() {
        const userId = $(this).data('id');
        if (confirm('Are you sure you want to delete this user?')) {
            $.ajax({
                url: `/admin/delete_user/${userId}`,
                type: 'POST',
                contentType: 'application/json',
                success: function(response) {
                    alert(response.message);
                    location.reload();
                },
                error: function(xhr) {
                    alert(xhr.responseJSON.message || 'Error deleting user.');
                }
            });
        }
    });

    // Delete Booking
    $(document).on('click', '.delete-booking-btn', function() {
        const bookingId = $(this).data('id');
        if (confirm('Are you sure you want to delete this booking?')) {
            $.ajax({
                url: `/cancel_booking/${bookingId}`,
                type: 'POST',
                contentType: 'application/json',
                success: function(response) {
                    alert(response.message);
                    location.reload();
                },
                error: function(xhr) {
                    alert(xhr.responseJSON.message || 'Error deleting booking.');
                }
            });
        }
    });

    // Delete Order
    $(document).on('click', '.delete-order-btn', function() {
        const orderId = $(this).data('id');
        if (confirm('Are you sure you want to delete this order?')) {
            $.ajax({
                url: `/admin/delete_order/${orderId}`,
                type: 'POST',
                contentType: 'application/json',
                success: function(response) {
                    alert(response.message);
                    location.reload();
                },
                error: function(xhr) {
                    alert(xhr.responseJSON.message || 'Error deleting order.');
                }
            });
        }
    });

    // Delete Meal
    $(document).on('click', '.delete-meal-btn', function() {
        const mealId = $(this).data('id');
        if (confirm('Are you sure you want to delete this meal?')) {
            $.ajax({
                url: `/admin/delete_meal/${mealId}`,
                type: 'POST',
                contentType: 'application/json',
                success: function(response) {
                    alert(response.message);
                    location.reload();
                },
                error: function(xhr) {
                    alert(xhr.responseJSON.message || 'Error deleting meal.');
                }
            });
        }
    });

    // Delete Table
    $(document).on('click', '.delete-table-btn', function() {
        const tableId = $(this).data('id');
        if (confirm('Are you sure you want to delete this table?')) {
            $.ajax({
                url: `/admin/delete_table/${tableId}`,
                type: 'POST',
                contentType: 'application/json',
                success: function(response) {
                    alert(response.message);
                    location.reload();
                },
                error: function(xhr) {
                    alert(xhr.responseJSON.message || 'Error deleting table.');
                }
            });
        }
    });

    // Status Updates
    $(document).on('change', '.status-select', function() {
        const id = $(this).data('id');
        const type = $(this).data('type');
        const status = $(this).val();
        const url = type === 'booking' ? `/admin/update_booking/${id}` : `/admin/update_order/${id}`;
        $.ajax({
            url: url,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ status: status }),
            success: function(response) {
                alert(response.message);
            },
            error: function(xhr) {
                alert(xhr.responseJSON.message || 'Error updating status.');
            }
        });
    });

    // Reset modals on close
    $('.modal').on('hidden.bs.modal', function() {
        $(this).find('form')[0].reset();
        $('#service_image_preview').addClass('d-none').attr('src', '');
        $('#edit_service_image_preview').addClass('d-none').attr('src', '');
        $('#edit_service_current_image').removeClass('d-none');
    });
});