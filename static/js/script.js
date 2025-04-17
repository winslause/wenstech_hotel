$(document).ready(function() {
    // Slideshow Logic
    const slides = $('.slide');
    let currentSlide = 0;

    function showSlide(index) {
        slides.removeClass('active');
        slides.eq(index).addClass('active');
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    }

    showSlide(currentSlide);
    setInterval(nextSlide, 5000);

    // Floating Sidebar Toggle
    $('#floating-icon').click(function() {
        $('#floating-sidebar').toggleClass('active');
    });

    // Password and Confirm Password Validation
    function validatePassword() {
        const password = $('#reg_password').val();
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
        const passwordFeedback = $('#password_feedback');
        if (password.length === 0) {
            $('#reg_password').removeClass('valid invalid');
            passwordFeedback.text('').removeClass('valid invalid');
        } else if (!passwordRegex.test(password)) {
            $('#reg_password').removeClass('valid').addClass('invalid');
            passwordFeedback.text('Password must be at least 8 characters with uppercase, lowercase, number, and special character.').addClass('invalid').removeClass('valid');
        } else {
            $('#reg_password').removeClass('invalid').addClass('valid');
            passwordFeedback.text('Password is strong!').addClass('valid').removeClass('invalid');
        }
        validateConfirmPassword();
    }

    function validateConfirmPassword() {
        const password = $('#reg_password').val();
        const confirmPassword = $('#reg_confirm_password').val();
        const confirmFeedback = $('#confirm_password_feedback');
        if (confirmPassword.length === 0) {
            $('#reg_confirm_password').removeClass('valid invalid');
            confirmFeedback.text('').removeClass('valid invalid');
        } else if (confirmPassword !== password) {
            $('#reg_confirm_password').removeClass('valid').addClass('invalid');
            confirmFeedback.text('Passwords do not match.').addClass('invalid').removeClass('valid');
        } else {
            $('#reg_confirm_password').removeClass('invalid').addClass('valid');
            confirmFeedback.text('Passwords match!').addClass('valid').removeClass('invalid');
        }
    }

    $('#reg_password').on('input', validatePassword);
    $('#reg_confirm_password').on('input', validateConfirmPassword);

    // Debug input changes for date, time, guests
    $(document).on('change input', '#serviceBookingForm #date, #serviceBookingForm #time, #serviceBookingForm #guests', function() {
        console.log(`${this.id} changed to:`, this.value);
    });

    // Register Form Submission
    $('#registerForm').submit(function(e) {
        e.preventDefault();
        const name = $('#reg_name').val();
        const email = $('#reg_email').val();
        const password = $('#reg_password').val();
        const confirmPassword = $('#reg_confirm_password').val();
        if (name.length < 2) {
            alert('Name must be at least 2 characters.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('Please enter a valid email address.');
            return;
        }
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/.test(password)) {
            alert('Password must be at least 8 characters with uppercase, lowercase, number, and special character.');
            return;
        }
        if (password !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }
        const data = {
            name: name,
            email: email,
            password: password,
            confirm_password: confirmPassword
        };
        $.ajax({
            url: '/register',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                alert(response.message);
                $('#registerModal').modal('hide');
                $('#registerForm')[0].reset();
                $('#reg_password, #reg_confirm_password').removeClass('valid invalid');
                $('#password_feedback, #confirm_password_feedback').text('').removeClass('valid invalid');
            },
            error: function(xhr) {
                alert(xhr.responseJSON.message || 'Error registering. Please try again.');
            }
        });
    });

    // Login Form Submission
    $('#loginForm').submit(function(e) {
        e.preventDefault();
        const data = {
            email: $('#login_email').val(),
            password: $('#login_password').val()
        };
        $.ajax({
            url: '/login',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                alert(response.message);
                $('#loginModal').modal('hide');
                $('#loginForm')[0].reset();
                window.location.href = '/profile';
            },
            error: function(xhr) {
                alert(xhr.responseJSON.message || 'Error logging in. Please try again.');
            }
        });
    });

    // Booking Form Submission
    $('#bookingForm').submit(function(e) {
        e.preventDefault();
        const data = {
            name: $('#name').val(),
            email: $('#email').val(),
            date: $('#date').val(),
            time: $('#time').val(),
            guests: $('#guests').val(),
            table_id: $('#table_id').val()
        };
        if (!data.table_id) {
            alert('Please select a table.');
            return;
        }
        $.ajax({
            url: '/book_table',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                alert(response.message);
                $('#bookingModal').modal('hide');
                $('#bookingForm')[0].reset();
                // Store selected table
                sessionStorage.setItem('selectedTable', data.table_id);
            },
            error: function(xhr) {
                alert(xhr.responseJSON.message || 'Error booking table. Please try again.');
            }
        });
    });

    // Food Order Form Submission
    $('#foodOrderForm').submit(function(e) {
        e.preventDefault();
        const selectedTable = $('#foodOrderForm #table_id').val();
        const items = [];
        $(this).find('input[type="checkbox"]:checked').each(function() {
            items.push($(this).val());
        });

        if (!selectedTable) {
            alert('Please select a table.');
            return;
        }
        if (items.length === 0) {
            alert('Please select at least one meal.');
            return;
        }

        const data = {
            booking_id: $('#booking_id').val() || null,
            table_id: selectedTable,
            items: items,
            special_requests: $('#special_requests').val()
        };

        $.ajax({
            url: '/order_food',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                alert(response.message);
                $('#foodOrderModal').modal('hide');
                $('#foodOrderForm')[0].reset();
                sessionStorage.removeItem('selectedTable');
                window.location.href = '/profile';
            },
            error: function(xhr) {
                alert(xhr.responseJSON?.message || 'Error placing order. Please try again.');
            }
        });
    });


     // Update booking_id when table_id changes
    $('#foodOrderForm #table_id').on('change', function() {
        const selectedOption = $(this).find('option:selected');
        const bookingId = selectedOption.data('booking-id') || '';
        $('#booking_id').val(bookingId);
        sessionStorage.setItem('selectedTable', $(this).val());
        console.log(`Food order table selected, booking_id: ${bookingId}, table_id: ${$(this).val()}`);
    });

    // Pre-select table on food order modal open
    $('#foodOrderModal').on('shown.bs.modal', function() {
        const tableSelect = $('#foodOrderForm #table_id');
        const savedTable = sessionStorage.getItem('selectedTable');
        if (savedTable && tableSelect.find(`option[value="${savedTable}"]`).length) {
            tableSelect.val(savedTable).trigger('change');
            console.log(`Restored table in food form: ${savedTable}`);
        } else if (tableSelect.find('option').length > 1) {
            // Select the first available booking if no saved table
            tableSelect.find('option').eq(1).prop('selected', true).trigger('change');
        }
    });

    // Service Booking Form Submission
    $('#serviceBookingForm').submit(function(e) {
        e.preventDefault();

        if (!$('#serviceBookingModal').hasClass('show')) {
            console.warn('Modal not visible, aborting submission');
            alert('Form is not ready. Please try again.');
            return;
        }

        const form = $(this);
        const tableSelect = form.find('#table_id');
        const tableId = tableSelect.val();
        const items = [];
        form.find('input[type="checkbox"]:checked').each(function() {
            items.push($(this).val());
        });

        const data = {
            service_id: form.find('#service_id').val(),
            name: form.find('#name').val(),
            email: form.find('#email').val(),
            date: form.find('#date').val() || form.find('#date_fallback').val(),
            time: form.find('#time').val() || form.find('#time_fallback').val(),
            guests: form.find('#guests').val(),
            table_id: tableId || '',
            items: items
        };

        if (!data.service_id || !data.name || !data.email) {
            alert('Please fill in all required fields: Service, Name, Email.');
            return;
        }
        if (!tableId) {
            alert('Please select a table.');
            return;
        }

        sessionStorage.setItem('selectedTable', tableId);
        $.ajax({
            url: '/book_service',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                alert(response.message);
                $('#serviceBookingModal').modal('hide');
                form[0].reset();
                window.location.href = '/profile';
            },
            error: function(xhr) {
                alert(xhr.responseJSON?.message || 'Error booking service. Please try again.');
            }
        });
    });

    // Track table selection for service booking
    $('#serviceBookingForm #table_id').on('change', function() {
        const tableId = $(this).val();
        if (tableId) {
            sessionStorage.setItem('selectedTable', tableId);
            console.log(`Table selected for service: ${tableId}`);
        }
    });

    // Update Profile Form Submission
    $('#updateProfileForm').submit(function(e) {
        e.preventDefault();
        const data = {
            name: $('#name').val(),
            email: $('#email').val(),
            password: $('#password').val()
        };
        $.ajax({
            url: '/profile',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                alert(response.message);
                location.reload();
            },
            error: function(xhr) {
                alert(xhr.responseJSON.message || 'Error updating profile.');
            }
        });
    });

    // Edit Booking Form Submission
    $('#editBookingForm').submit(function(e) {
        e.preventDefault();
        const items = [];
        $(this).find('input[type="checkbox"]:checked').each(function() {
            items.push($(this).val());
        });
        const data = {
            booking_id: $('#booking_id').val(),
            date: $('#edit_date').val(),
            time: $('#edit_time').val(),
            guests: $('#edit_guests').val(),
            table_id: $('#edit_table_id').val(),
            items: items
        };
        if (!data.table_id) {
            alert('Please select a table.');
            return;
        }
        $.ajax({
            url: '/profile',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                alert(response.message);
                $('#editBookingModal').modal('hide');
                location.reload();
            },
            error: function(xhr) {
                alert(xhr.responseJSON.message || 'Error updating booking.');
            }
        });
    });

    // Cancel Booking
    $('.cancel-booking-btn').click(function() {
        const bookingId = $(this).data('id');
        if (confirm('Are you sure you want to cancel this booking?')) {
            $.ajax({
                url: `/cancel_booking/${bookingId}`,
                type: 'POST',
                contentType: 'application/json',
                success: function(response) {
                    alert(response.message);
                    location.reload();
                },
                error: function(xhr) {
                    alert(xhr.responseJSON.message || 'Error cancelling booking.');
                }
            });
        }
    });

    // Edit Booking Button
    $('.edit-booking-btn').click(function() {
        const bookingId = $(this).data('id');
        $('#booking_id').val(bookingId);
        $('#editBookingModal').modal('show');
    });

    // Book Service Button
    $('.book-service-btn').click(function() {
        const serviceId = $(this).data('service-id');
        console.log('Book button clicked, service_id:', serviceId);
        $('#service_id').val(serviceId);
        $('#serviceBookingModal').modal('show');
    });

    // Smooth Scroll for Nav Links
    $('a.nav-link').click(function(e) {
        if (this.hash !== '' && !$(this).attr('data-bs-toggle')) {
            e.preventDefault();
            const hash = this.hash;
            $('html, body').animate({
                scrollTop: $(hash).offset().top
            }, 800);
        }
    });

    // Debug active bookings on load
    $.ajax({
        url: '/api/bookings/active',
        type: 'GET',
        xhrFields: { withCredentials: true },
        success: function(data) {
            console.log('Active bookings:', data);
            if (data.length === 0) {
                console.warn('No active bookings found');
            } else {
                const tableSelect = $('#foodOrderForm #table_id');
                if (tableSelect.length) {
                    tableSelect.empty();
                    tableSelect.append('<option value="">Select a table</option>');
                    data.forEach(booking => {
                        tableSelect.append(
                            `<option value="${booking.table_id}" data-booking-id="${booking.id}">` +
                            `Table ${booking.table.table_number} (Booked: ${booking.date})</option>`
                        );
                    });
                    const savedTable = sessionStorage.getItem('selectedTable');
                    if (savedTable && tableSelect.find(`option[value="${savedTable}"]`).length) {
                        tableSelect.val(savedTable).trigger('change');
                    } else if (tableSelect.find('option').length > 1) {
                        tableSelect.find('option').eq(1).prop('selected', true).trigger('change');
                    }
                }
            }
        },
        error: function(xhr) {
            console.error('Error fetching bookings:', xhr.responseJSON);
        }
    });
});