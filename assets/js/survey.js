jQuery(document).ready(function($) {
    'use strict';
    
    const $form = $('#survey-form');
    if (!$form.length) return;

    function initializeSurveyForm() {
        // Wait for access control to be ready
        if (!window.accessControl) {
            setTimeout(initializeSurveyForm, 100);
            return;
        }

        // Get token from access control
        const token = window.accessControl.token;
        
        // If no token, let access control handle the login message
        if (!token) {
            // Don't redirect, let access control handle it
            return;
        }

        // Set token in form
        $('#survey-token').val(token);
        
        // Enable the form
        $form.removeClass('loading');
        setupFormHandlers();
    }

    function setupFormHandlers() {
        $form.on('submit', function(e) {
            e.preventDefault();
            const $submitButton = $form.find('.submit-button');
            if ($submitButton.prop('disabled')) return false;
            
            $submitButton.prop('disabled', true).css('opacity', '0.7');
            
            const formData = new FormData(this);
            formData.append('action', 'submit_survey');
            formData.append('nonce', surveySystem.surveyNonce);

            $.ajax({
                url: surveySystem.ajaxurl,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: handleSubmissionSuccess,
                error: handleSubmissionError
            });
            
            return false;
        });
    }

    function handleSubmissionSuccess(response) {
        if (response.success) {
            // Show feedback for matching questions first
            showQuestionFeedback();

            // Update progress tracking
            if (window.progressTracker) {
                window.progressTracker.saveProgress();
                window.progressTracker.updateProgressUI();
            }

            // Show video if exists
            const $video = $('.et_pb_video.vid-1-1');
            if ($video.length) {
                $video.show().css({
                    'display': 'block',
                    'opacity': '1',
                    'visibility': 'visible'
                });
            }
            
            // Delay the success message to allow feedback to be seen
            setTimeout(() => {
                showSuccessMessage(response.data);
            }, 2000);
        } else {
            handleSubmissionError(response);
        }
    }

    function showQuestionFeedback() {
        // Handle matching questions feedback
        $('.matching-item-row').each(function() {
            const $row = $(this);
            const $options = $row.find('input[type="radio"]');
            const $feedbackContainer = $row.find('.feedback-container');
            
            // Show feedback if an option is selected
            if ($options.is(':checked') && $feedbackContainer.length) {
                $feedbackContainer.addClass('show');
            }
        });

        // Disable all inputs after showing feedback
        $form.find('input, select, textarea').prop('disabled', true);

        // Scroll to first feedback if any exists
        const $firstFeedback = $('.feedback-container.show').first();
        if ($firstFeedback.length) {
            $('html, body').animate({
                scrollTop: $firstFeedback.offset().top - 100
            }, 500);
        }
    }

    function handleSubmissionError(error) {
        const $submitButton = $form.find('.submit-button');
        $submitButton.prop('disabled', false).css('opacity', '1');
        
        const message = error.data ? error.data.message : 'An error occurred. Please try again.';
        $('.status-text').text('Error: ' + message);
    }

    function showSuccessMessage(data) {
        // Don't immediately hide everything - let users see the feedback
        const $nonFeedbackElements = $form.find('.question-block:not(:has(.feedback-container.show)), .survey-submit');
        $nonFeedbackElements.fadeOut(300, function() {
            $form.find('.survey-success-message').fadeIn(300);
        });

        // Fade out feedback containers after a delay
        setTimeout(() => {
            $('.feedback-container.show').fadeOut(300);
        }, 1500);
    }

    // Add loading state to form initially
    $form.addClass('loading');
    
    // Start initialization
    initializeSurveyForm();

    // Optional: Add reset handler if needed
    $form.on('reset', function() {
        $('.feedback-container').removeClass('show');
        $form.find('input, select, textarea').prop('disabled', false);
        $form.find('.submit-button').prop('disabled', false).css('opacity', '1');
        $('.status-text').text('');
    });
});