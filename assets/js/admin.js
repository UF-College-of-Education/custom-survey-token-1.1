// file: admin.js
jQuery(document).ready(function($) {
    'use strict';
    console.log('Survey admin script loaded');

    var mediaUploader;

        // Handle adding new text input fields
        $('.add-text-input').on('click', function() {
            console.log('Add text input button clicked');

            const container = $('#text-inputs-container');
            const index = container.children('.text-input-row').length;
            console.log('Creating new input row with index:', index);

            
            const newInput = $(`
                <div class="text-input-row">
                    <span class="dashicons dashicons-menu handle"></span>
                    <div class="text-input-fields">
                        <input type="text" 
                            class="widefat text-input-label" 
                            name="text_inputs[${index}][label]" 
                            placeholder="Label (e.g., First Wish)">
                        <input type="text" 
                            class="widefat text-input-placeholder" 
                            name="text_inputs[${index}][placeholder]" 
                            placeholder="Placeholder text (optional)">
                    </div>
                    <span class="dashicons dashicons-trash remove-text-input"></span>
                </div>
            `);
            
            container.append(newInput);
            updateInputIndices();
        });
    
        // Handle removing text input fields
        $(document).on('click', '.remove-text-input', function() {
            if ($('.text-input-row').length > 1) {
                $(this).closest('.text-input-row').remove();
                updateInputIndices();
            } else {
                alert('You must have at least one text input.');
            }
        });
    
        // Make text inputs sortable
        if ($.fn.sortable) {
            $('#text-inputs-container').sortable({
                handle: '.handle',
                axis: 'y',
                update: function() {
                    updateInputIndices();
                }
            });
        }
    // Function to update indices of text inputs after sorting or removal
    function updateInputIndices() {
        $('#text-inputs-container .text-input-row').each(function(index) {
            $(this).find('.text-input-label').attr('name', `text_inputs[${index}][label]`);
            $(this).find('.text-input-placeholder').attr('name', `text_inputs[${index}][placeholder]`);
        });
    }
    
    
    
    // Image upload handling for question image
    $('.upload-image').on('click', function(e) {
        e.preventDefault();
        
        if (mediaUploader) {
            mediaUploader.open();
            return;
        }
        
        mediaUploader = wp.media({
            title: 'Choose Question Image',
            button: {
                text: 'Use this image'
            },
            multiple: false
        });
        
        mediaUploader.on('select', function() {
            const attachment = mediaUploader.state().get('selection').first().toJSON();
            $('#question_image').val(attachment.url);
            
            const $previewWrapper = $('.image-preview-wrapper');
            $previewWrapper.html(`
                <img src="${attachment.url}" 
                     class="question-image-preview" 
                     alt="Question image preview">
            `).show();
            
            $('.remove-image').show();
        });
        
        mediaUploader.open();
    });

    $('.remove-image').on('click', function(e) {
        e.preventDefault();
        $('#question_image').val('');
        $('.image-preview-wrapper').empty().hide();
        $(this).hide();
    });

    // Handle adding new options
    $('.add-option').on('click', function() {
        const questionType = $('#question_type').val();
        const optionsContainer = $('#options-container');
        const optionCount = optionsContainer.children('.option-row').length;
        
        const newOption = $(`
            <div class="option-row">
                <span class="dashicons dashicons-menu handle"></span>
                <div class="option-content">
                    <input type="text" class="widefat option-text" name="question_options[]" value="">
                    <div class="correct-answer-toggle">
                        <label class="correct-answer-label">
                            <input type="${questionType === 'radio' ? 'radio' : 'checkbox'}"
                                   name="correct_answers${questionType === 'checkbox' ? '[]' : ''}"
                                   value="">
                            Correct Answer
                        </label>
                    </div>
                </div>
                <span class="dashicons dashicons-trash remove-option"></span>
            </div>
        `);
        
        optionsContainer.append(newOption);
        updateFeedbackFields();
    });


    $('#question_type').on('change', function() {
        const type = $(this).val();
        const isMultiChoice = type === 'radio' || type === 'checkbox';
        
        $('#options_section').toggle(isMultiChoice);


        if ($(this).val() === 'multiple_text') {
            $('#multiple_text_settings').slideDown();
        } else {
            $('#multiple_text_settings').slideUp();
        }


        if (isMultiChoice) {
            $('.correct-answer-toggle input').each(function() {
                $(this).attr('type', type);
                if (type === 'checkbox') {
                    $(this).attr('name', 'correct_answers[]');
                } else {
                    $(this).attr('name', 'correct_answers');
                }
            });
        }
        
        updateFeedbackFields();
    });


    // Sync option text with correct answer value
    $(document).on('input', '.option-text', function() {
        const optionText = $(this).val();
        $(this).closest('.option-content')
               .find('.correct-answer-toggle input')
               .val(optionText);
        updateFeedbackFields();
    });

    // Remove option handler
    $(document).on('click', '.remove-option', function() {
        if ($('.option-row').length > 1) {
            $(this).closest('.option-row').remove();
            updateFeedbackFields();
        } else {
            alert('You must have at least one option.');
        }
    });

    // Make options sortable
    if ($.fn.sortable) {
        $('#options-container').sortable({
            handle: '.handle',
            axis: 'y',
            update: function() {
                updateFeedbackFields();
            }
        });
    }

    // Function to update feedback fields
    function updateFeedbackFields() {
        const type = $('#question_type').val();
        const $feedbackContainer = $('#feedback-container');
        
        // Store current feedback values
        const currentFeedback = {};
        $feedbackContainer.find('textarea').each(function() {
            const name = $(this).attr('name');
            const value = $(this).val();
            if (value) {
                currentFeedback[name] = value;
            }
        });
        
        // Generate new feedback fields based on type
        if (type === 'radio' || type === 'checkbox') {
            // Your existing radio/checkbox feedback code
            let feedbackHtml = '<div class="feedback-options">';
            
            $('#options-container .option-row').each(function() {
                const optionText = $(this).find('.option-text').val();
                if (optionText) {
                    const feedbackKey = `question_feedback[${optionText}]`;
                    const existingFeedback = currentFeedback[feedbackKey] || '';
                    
                    feedbackHtml += `
                        <div class="feedback-row">
                            <label>Feedback for "${optionText}":</label>
                            <textarea name="${feedbackKey}" 
                                      class="widefat feedback-text" 
                                      rows="2">${existingFeedback}</textarea>
                        </div>`;
                }
            });
            
            feedbackHtml += '</div>';
            $feedbackContainer.html(feedbackHtml);
        } else {
            // For text, textarea, and goals questions, show general feedback
            const generalFeedback = currentFeedback['question_feedback[general]'] || '';
            const placeholder = type === 'goals' ? 
                'Enter feedback for completed goals list...' : 
                'Enter general feedback for this question...';
                
            $feedbackContainer.html(`
                <textarea name="question_feedback[general]" 
                          class="widefat feedback-text" 
                          rows="2" 
                          placeholder="${placeholder}">${generalFeedback}</textarea>
            `);
        }
    }
});