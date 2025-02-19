(function($) {
    'use strict';

    class SurveyResponses {
        constructor() {
            this.initializationAttempts = 0;
            this.maxAttempts = 10;
            this.initialize();
        }

        initialize() {
            console.log('Attempting to initialize SurveyResponses...');
            
            if (!window.accessControl) {
                this.initializationAttempts++;
                if (this.initializationAttempts < this.maxAttempts) {
                    console.log(`Access control not initialized, attempt ${this.initializationAttempts}/${this.maxAttempts}`);
                    setTimeout(() => this.initialize(), 500);
                    return;
                } else {
                    console.error('Failed to initialize access control after maximum attempts');
                    this.showError('Failed to initialize access control. Please refresh the page.');
                    return;
                }
            }

            this.token = window.accessControl.token;
            console.log('Token status:', this.token ? 'found' : 'missing');
            
            this.initializeElements();

            if (this.token) {
                this.loadResponses();
            } else {
                this.showError('Please log in to view your responses.');
            }
        }

        initializeElements() {
            this.elements = {
                viewer: $('#survey-responses-viewer'),
                loading: $('#responses-loading'),
                content: $('#responses-section'),
                container: $('#responses-container'),
                error: $('#responses-error')
            };

            // Verify elements exist
            Object.entries(this.elements).forEach(([key, element]) => {
                if (!element.length) {
                    console.error(`Required element not found: ${key}`);
                }
            });
        }

        loadResponses() {
            console.log('Loading responses for token:', this.token);
            this.elements.loading.show();
            this.elements.content.hide();
            this.elements.error.hide();

            // Get the nonce from the surveyConfig global
            const nonce = surveyConfig.nonce;
            console.log('Using nonce for request:', nonce);

            $.ajax({
                url: surveyConfig.ajaxurl,
                type: 'POST',
                data: {
                    action: 'get_survey_responses',
                    token: this.token,
                    nonce: nonce
                },
                success: (response) => {
                    console.log('Response received:', response);
                    if (response.success && Array.isArray(response.data)) {
                        this.handleResponse(response);
                    } else {
                        const errorMessage = response.data?.message || 'Failed to load responses';
                        console.error('Response error:', errorMessage);
                        this.showError(errorMessage);
                    }
                },
                error: (xhr, status, error) => {
                    console.error('Ajax error:', {xhr, status, error});
                    this.showError('Error loading responses. Please try again later.');
                }
            });
        }

        handleResponse(response) {
            this.elements.loading.hide();
            
            if (response.success && Array.isArray(response.data)) {
                console.log('Processing responses:', response.data);
                
                if (response.data.length > 0) {
                    // Group responses by module hierarchy
                    const organizedResponses = this.organizeResponses(response.data);
                    const content = this.generateModulesContent(organizedResponses);
                    this.elements.container.html(content);
                    this.elements.content.show();
                } else {
                    this.elements.container.html(this.generateEmptyState());
                    this.elements.content.show();
                }
            } else {
                this.showError('Invalid response format received.');
            }
        }

        organizeResponses(responses) {
            const organized = {};
            
            responses.forEach(item => {
                const parentModule = item.parent_module_name || 'General';
                const module = item.module_name || 'Uncategorized';
                
                if (!organized[parentModule]) {
                    organized[parentModule] = { modules: {} };
                }
                
                if (!organized[parentModule].modules[module]) {
                    organized[parentModule].modules[module] = {
                        responses: []
                    };
                }
                
                organized[parentModule].modules[module].responses.push(item);
            });
            
            return organized;
        }

        generateModulesContent(organized) {
            let html = '<div class="modules-container">';
            
            Object.entries(organized).forEach(([parentModule, data]) => {
                html += `
                    <div class="module-section">
                        <h3 class="module-header">${this.escapeHtml(parentModule)}</h3>
                        ${this.generateModuleContent(data.modules)}
                    </div>
                `;
            });
            
            html += '</div>';
            return html;
        }

        generateModuleContent(modules) {
            let html = '';
            
            Object.entries(modules).forEach(([moduleName, moduleData]) => {
                if (moduleData.responses.length > 0) {
                    html += `
                        <div class="module-subsection">
                            <h4 class="submodule-header">${this.escapeHtml(moduleName)}</h4>
                            <div class="responses-list">
                                ${moduleData.responses.map(response => this.generateResponseItem(response)).join('')}
                            </div>
                        </div>
                    `;
                }
            });
            
            return html;
        }

        generateResponseItem(response) {
            return `
                <div class="response-item">
                    <div class="question">${this.escapeHtml(response.question)}</div>
                    <div class="answer">${this.formatResponse(response.response)}</div>
                    <div class="timestamp">Submitted on ${this.formatDate(response.created_at)}</div>
                </div>
            `;
        }

        generateEmptyState() {
            return `
                <div class="empty-state">
                    <p>You haven't submitted any responses yet.</p>
                    <p>Complete some modules to see your responses here.</p>
                </div>
            `;
        }

        formatResponse(response) {
            if (!response) return '';
            
            // Handle array responses (e.g., from checkboxes)
            if (response.includes(',')) {
                return response.split(',')
                    .map(item => this.escapeHtml(item.trim()))
                    .join('<br>');
            }
            return this.escapeHtml(response);
        }

        formatDate(dateString) {
            if (!dateString) return '';
            
            const date = new Date(dateString);
            return date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        escapeHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        showError(message) {
            console.error('Error:', message);
            this.elements.loading.hide();
            this.elements.content.hide();
            this.elements.error
                .html(`<p class="error-message">${this.escapeHtml(message)}</p>`)
                .show();
        }
    }

    // Initialize when document is ready
    $(document).ready(() => {
        if ($('#survey-responses-viewer').length) {
            // Wait for access control to be fully initialized
            setTimeout(() => {
                try {
                    window.surveyResponses = new SurveyResponses();
                } catch (error) {
                    console.error('Failed to initialize survey responses:', error);
                    $('#responses-error')
                        .html('<p class="error-message">Failed to initialize responses viewer. Please refresh the page.</p>')
                        .show();
                }
            }, 1000);
        } else {
            console.log('Survey responses viewer element not found on page');
        }
    });

})(jQuery);