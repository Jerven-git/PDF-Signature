$(document).ready(function() {
    let currentPdfId = null; // Variable to store the current PDF ID
    let draggedCoordinates = { x: 0, y: 0 };
    let globalCanvasWidth;
    let globalCanvasHeight;
    let currentScale = 1.5; // Default scale
    let pdfDocument = null;
    let currentPageNumber = 1; // Track the current page number
    let totalPages = 0;
    let renderTask = null;

    function initializeDocSign() {
        $('#fileUploadForm').on('submit', function(event) {
            event.preventDefault();

            let formData = new FormData(this);

            $.ajax({
                url: '/api/document-sign/pdfs/upload',
                type: 'POST',
                data: formData,
                contentType: false,
                processData: false,
                success: function(response) {
                    $('#uploadDocSign').val('');
                    $('#fileSign').empty();
                    $('#documentSignModal').modal('hide');

                    Swal.fire({
                        icon: 'success',
                        title: response.success,
                        showConfirmButton: true,
                        confirmButtonText: 'OK',
                    }).then(() => {
                        //
                    });
                },
                error: function(xhr, status, error) {
                    // Handle error responses (HTTP 400, 409, etc.)
                    let errorMessage = 'There was an error processing your request.';
                    let errorTitle = 'Error';

                    if (xhr.responseJSON) {
                        if (xhr.status === 409) {
                            errorMessage = xhr.responseJSON.error || 'A file with the same name already exists.';
                        } else if (xhr.status === 400) {
                            errorMessage = xhr.responseJSON.error || 'No files were uploaded.';
                        } else {
                            // Handle other HTTP status codes if needed
                            errorMessage = xhr.responseJSON.error || 'An unexpected error occurred.';
                        }
                    }

                    Swal.fire({
                        title: errorTitle,
                        text: errorMessage,
                        icon: 'warning',
                        showConfirmButton: true,
                        confirmButtonText: 'OK',
                    });
                }
            });
        });
    }

    // Fetch and display PDFs
    $.ajax({
        url: '/api/document-sign/pdfs/list',
        type: 'GET',
        success: function(response) {
            if (response.data) {
                if (response.data.length > 0) {
                    let tableHtml = `
                        <table class="table table-sm table-bordered">
                            <thead>
                                <tr>
                                    <th>PDF Name</th>
                                    <th>Action</th>
                                    <th>Delete</th>
                                </tr>
                            </thead>
                        <tbody>
                    `;
                            
            response.data.forEach(function(pdf) {
                tableHtml += `
                    <tr>
                        <td><span class="pdf-link" data-id="${pdf.id}" data-name="${pdf.file_name}">${pdf.file_name}</span></td>
                        <td><button class="btn btn-primary btn-sm open-pdf" data-id="${pdf.id}"><i class="fas fa-file-signature"></i></button></td>
                        <td><button class="btn btn-danger btn-sm delete-pdf" data-id="${pdf.id}"><i class="fas fa-trash"></i></button></td>
                    </tr>
                `;
            });
                            
                tableHtml += `
                    </tbody>
                    </table>
                `;
                            
                $('#pdfListContainer').html(tableHtml);
            } else {
                $('#pdfListContainer').html('<p>No PDFs found.</p>');
            }
            } else if (response.message) {
                $('#pdfListContainer').html('<p>' + response.message + '</p>');
            }
        },
        error: function(xhr) {
            const response = JSON.parse(xhr.responseText);
                $('#pdfListContainer').html('<p>' + (response.error || 'Error fetching PDFs.') + '</p>');
        }
    });

    $(document).on('click', '.open-pdf', function() {
        openPdf($(this).data('id'));
        $('#docSignModal').modal('show');
    });
    
    window.openPdf = function(pdfId) {
        // Reset or clear the necessary variables
        if (renderTask) {
            renderTask.cancel(); // Cancel any ongoing render tasks
            renderTask = null;
        }

        // Clear the canvas
        const $canvas = $('#pdf-canvas');
        const canvas = $canvas[0];
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Reset PDF-specific variables
        currentPdfId = null;
        pdfDocument = null;
        totalPages = 0;
        currentPageNumber = 1;
        currentScale = 1.5;

        // Set the current PDF ID and URL
        currentPdfId = pdfId;
        const url = `/api/document-sign/pdfs/preview/${currentPdfId}`;

        // Display loading message
        function displayLoadingMessage() {
            // Clear the canvas
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            // Create an image element for the GIF
            var loadingImage = new Image();
            loadingImage.src = '/css/preloader/PDFLoading.gif';
        
            // Draw the image on the canvas when it's loaded
            loadingImage.onload = function() {
                // Optionally, you can adjust the position and size of the GIF here
                var x = (canvas.width - loadingImage.width) / 2; // Center horizontally
                var y = (canvas.height - loadingImage.height) / 2; // Center vertically
                context.drawImage(loadingImage, x, y);
            };
        }

        // Handle errors
        function handleError(error, message) {
            console.error(message, error);
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.fillText(message, 10, 50);
        }

        // Render the PDF page
        window.renderPage = function(pageNumber) {
            if (pageNumber < 1 || pageNumber > totalPages) {
                handleError(null, 'Error: Page number out of bounds.');
                return;
            }

            // Cancel previous render task if any
            if (renderTask) {
                renderTask.cancel();
            }

            pdfDocument.getPage(pageNumber).then(function(page) {
                const scaledViewport = page.getViewport({ scale: currentScale });

                canvas.width = scaledViewport.width;
                canvas.height = scaledViewport.height;

                $canvas.css({
                    width: `${scaledViewport.width}px`,
                    height: `${scaledViewport.height}px`
                });
                globalCanvasWidth = scaledViewport.width;
                globalCanvasHeight = scaledViewport.height;

                const renderContext = {
                    canvasContext: context,
                    viewport: scaledViewport
                };

                renderTask = page.render(renderContext);

                renderTask.promise.then(function() {
                    renderTask = null;
                    $('#current-page').text(currentPageNumber);
                }).catch(function(error) {
                    handleError(error, 'Error rendering page:');
                });

            }).catch(function(error) {
                handleError(error, 'Error getting page:');
            });
        }
    
        // Event listeners for zoom and page navigation
        $('#zoom-in').off('click').on('click', function() {
            currentScale += 0.1;
            renderPage(currentPageNumber);
        });
    
        $('#zoom-out').off('click').on('click', function() {
            currentScale = Math.max(0.1, currentScale - 0.1);
            renderPage(currentPageNumber);
        });
    
        $('#prev-page').off('click').on('click', function() {
            if (currentPageNumber > 1) {
                currentPageNumber--;
                renderPage(currentPageNumber);
            }
        });
    
        $('#next-page').off('click').on('click', function() {
            if (currentPageNumber < totalPages) {
                currentPageNumber++;
                renderPage(currentPageNumber);
            }
        });
    
        // Load the PDF document
        displayLoadingMessage();
    
        pdfjsLib.getDocument(url).promise.then(function(pdf) {
            pdfDocument = pdf;
            totalPages = pdf.numPages;
            $('#total-pages').text(totalPages);
            renderPage(currentPageNumber);
        }).catch(function(error) {
            handleError(error, 'Error loading PDF.');
        });
    
        $('#signature-pad-container').show();
    }    

   // Generate the signature and set it up for dragging
    window.generateSignature = function() {
        const $signaturePad = $('#signature-pad');
        const signatureData = $signaturePad.jqSignature('getDataURL');
    
        if (signatureData) {
            const img = new Image();
            img.src = signatureData;
    
            img.onload = function() {
                const tempCanvas = document.createElement('canvas');
                const tempContext = tempCanvas.getContext('2d');
                tempCanvas.width = img.width;
                tempCanvas.height = img.height;
    
                tempContext.drawImage(img, 0, 0);
    
                const imgData = tempContext.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                const data = imgData.data;
    
                let cropTop = tempCanvas.height, cropLeft = tempCanvas.width, cropRight = 0, cropBottom = 0;
    
                for (let y = 0; y < tempCanvas.height; y++) {
                    for (let x = 0; x < tempCanvas.width; x++) {
                        const alpha = data[(y * tempCanvas.width + x) * 4 + 3];
                        if (alpha > 0) {
                            if (x < cropLeft) cropLeft = x;
                            if (x > cropRight) cropRight = x;
                            if (y < cropTop) cropTop = y;
                            if (y > cropBottom) cropBottom = y;
                        }
                    }
                }
    
                const cropWidth = cropRight - cropLeft + 1;
                const cropHeight = cropBottom - cropTop + 1;
    
                const croppedCanvas = document.createElement('canvas');
                const croppedContext = croppedCanvas.getContext('2d');
                croppedCanvas.width = cropWidth;
                croppedCanvas.height = cropHeight;
    
                croppedContext.putImageData(tempContext.getImageData(cropLeft, cropTop, cropWidth, cropHeight), 0, 0);
    
                const croppedSignatureData = croppedCanvas.toDataURL();
    
                // Draw the cropped signature directly onto the existing #pdf-canvas
                const $pdfContainer = $('#pdf-container');
                const $pdfCanvas = $('#pdf-canvas');
                const canvasWidth = $pdfCanvas.width();
                const canvasHeight = $pdfCanvas.height();
    
                // Ensure that the #signature-holder div does not already exist before appending
                $('#signature-holder').remove(); 
    
                // Append a new container for the signature
                $pdfContainer.append(`
                    <div id="signature-holder" style="position: absolute; width: ${canvasWidth}px; height: ${canvasHeight}px;">
                        <img id="draggable-signature" src="${croppedSignatureData}" alt="Generated Signature" style="position: absolute;"/>
                    </div>
                `);

                setTimeout(() => {
                    const $generatedSignature = $('#draggable-signature');
                    signatureSize = {
                        width: $generatedSignature.width(),
                        height: $generatedSignature.height()
                    };
                    console.log('Signature Size:', signatureSize);
                }, 100);

                // Enable dragging with Interact.js
                interact('#draggable-signature').draggable({
                    inertia: true,
                    autoScroll: true,
                
                    listeners: {
                        move(event) {
                            const target = event.target;
                            const canvas = document.querySelector('#pdf-canvas');
                            const rect = canvas.getBoundingClientRect();

                            // Calculate new position
                            let x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                            let y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                            // Get the width and height of the draggable element
                            const elemWidth = target.offsetWidth;
                            const elemHeight = target.offsetHeight;
                            console.log('Element Width:', elemWidth);
                            console.log('Element Height:', elemHeight);
                            // Check if the new position is within the canvas bounds
                            if (x < 0) x = 0; // Left boundary
                            if (y < 0) y = 0; // Top boundary
                            if (x + elemWidth > rect.width) x = rect.width - elemWidth; // Right boundary
                            if (y + elemHeight > rect.height) y = rect.height - elemHeight; // Bottom boundary

                            // Update the element's position with translate
                            target.style.transform = `translate(${x}px, ${y}px)`;

                            draggedCoordinates = { x, y };
                            
                            // Store the coordinates for later use
                            target.setAttribute('data-x', x);
                            target.setAttribute('data-y', y);
                        }
                    }
                })
                /** TODO Need to add a default resize in smale sizes to avoid the signature to dissapear */
                .resizable({
                    // Define edges for resizing
                    edges: { top: true, left: true, bottom: true, right: true },
                
                    listeners: {
                        move(event) {
                            const target = event.target;
                            let { x, y } = target.dataset;

                            // Update the position based on the delta
                            x = (parseFloat(x) || 0) + event.deltaRect.left;
                            y = (parseFloat(y) || 0) + event.deltaRect.top;

                            // Apply the new width, height, and position
                            Object.assign(target.style, {
                                width: `${event.rect.width}px`,
                                height: `${event.rect.height}px`,
                                transform: `translate(${x}px, ${y}px)`
                            });

                            // Update the dataset with the new position
                            Object.assign(target.dataset, { x, y });

                            // Update global size variable
                            signatureSize = {
                                width: event.rect.width,
                                height: event.rect.height
                            };
                        }
                    }
                });                
                
                $('#saveBtn').on('click', function() {
                    if (currentPdfId) {
                        saveSignature(croppedSignatureData, currentPdfId, draggedCoordinates, signatureSize); // Pass currentPdfId to the saveSignature function
                    } else {
                        alert('No PDF is currently opened.');
                    }
                });
            };
        } else {
            alert('Please sign before generating.');
        }
    }

    // Save the signature to the PDF
    function saveSignature(signatureData, pdfId, draggedCoordinates, signatureSize) {
        const { x, y } = draggedCoordinates;
        const { width, height } = signatureSize;
    
        const adjustedX = x;
        const adjustedY = y;
        const adjustedsignatureWidth = width;
        const adjustedsignatureHeight = height;
    
        // Capture the start time when the loading screen is shown
        const startTime = Date.now();
        
        showLoadingScreen('Generating PDF with signature...');
    
        // Ensure the loading screen stays up for at least 7 seconds
        let hideLoadingTimeout = setTimeout(() => {
            hideLoadingScreen();
        }, 7000); // 7-second delay
    
        $.ajax({
            url: `/api/document-sign/pdfs/save/${pdfId}`,
            type: 'POST',
            data: {
                pdfId: pdfId,
                signature: signatureData,
                x: adjustedX,
                y: adjustedY,
                width: adjustedsignatureWidth,
                height: adjustedsignatureHeight,
                canvasWidth: globalCanvasWidth,  // Pass canvas dimensions
                canvasHeight: globalCanvasHeight, // Pass canvas dimensions
                pageNumber: currentPageNumber,
            },
            success: function(response) {
                $('#signature-holder').empty();
                $('#signature-pad').jqSignature('clearCanvas');

                // Clear the timeout if AJAX finishes before the delay
                clearTimeout(hideLoadingTimeout);
    
                // Calculate how much time has passed since the loading started
                const timeElapsed = Date.now() - startTime;
    
                // Keep the loading screen visible for at least the remaining time
                setTimeout(function() {
                    hideSaveLoadingScreen();
                    toastr.success(response.message || 'PDF saved with signature successfully.');
    
                    // Re-render the PDF page
                    const updatedPdfUrl = `/api/document-sign/pdfs/preview/${pdfId}`;
                    loadUpdatedPdf(updatedPdfUrl);
                }, Math.max(0, 7000 - timeElapsed)); // Ensure it stays for 7 seconds
            },
            error: function(xhr, status, error) {
                clearTimeout(hideLoadingTimeout);
    
                let errorMessage = 'There was an error processing your request.';
                if (xhr.responseJSON) {
                    if (xhr.status === 400) {
                        errorMessage = xhr.responseJSON.error || 'Bad request.';
                    } else if (xhr.status === 404) {
                        errorMessage = xhr.responseJSON.error || 'File not found.';
                    } else if (xhr.status === 500) {
                        errorMessage = xhr.responseJSON.error || 'Internal server error.';
                    } else {
                        errorMessage = xhr.responseJSON.error || 'An unexpected error occurred.';
                    }
                }
                toastr.error(errorMessage, 'Error');
                hideSaveLoadingScreen();
            }
        });
    }

    function loadUpdatedPdf(pdfUrl) {
        // Load the updated PDF from the new URL
        pdfjsLib.getDocument(pdfUrl).promise.then(function(pdf) {
            pdfDocument = pdf;
            totalPages = pdf.numPages;
            $('#total-pages').text(totalPages);
    
            // Re-render the current page with the updated PDF
            renderPage(currentPageNumber);
        }).catch(function(error) {
            handleError(error, 'Error loading updated PDF.');
        });
    }
    
    function showLoadingScreen(message) {
        const loadingOverlay = $('<div>')
            .attr('id', 'loading-overlay')
            .css({
                'position': 'absolute',
                'top': '0',
                'left': '0',
                'width': '100%',
                'height': '100%',
                'background': 'rgba(0, 0, 0, 0.5)',
                'z-index': '9999',
                'display': 'flex',
                'flex-direction': 'column',
                'justify-content': 'center',
                'align-items': 'center',
                'color': '#fff',
                'font-size': '24px',
                'overflow': 'hidden'
            });
    
        const loadingImage = $('<img>')
            .attr('src', '/css/preloader/PDFGenerate.gif') // Replace with the correct path
            .css({
                'width': '100px',
                'height': '100px',
                'margin-bottom': '20px'
            });
    
        loadingOverlay.append(loadingImage).append($('<div>').text(message));
    
        $('body').append(loadingOverlay);
    }
    
    function hideSaveLoadingScreen() {
        $('#loading-overlay').remove();
    }
    

    // Clear canvas function
    window.clearSign = function() {
        $('#signature-pad').jqSignature('clearCanvas');
        $('#signature-holder').empty(); // Clear the generated signature as well
        resetSignatureImage();
        draggedCoordinates = { x: 0, y: 0 }; // Reset coordinates
    }

    function initializeSignaturePad() {
        $('#signature-pad').jqSignature({
            width: 600,
            height: 200,
            border: '1px solid',
            lineWidth: 2,
        });
    }

    // Default dimensions for signature display
    const defaultSignatureDimensions = {
        width: 200,
        height: 100
    };

    // Clear canvas function
    window.clearSign = function() {
        $('#signature-pad').jqSignature('clearCanvas');
        resetSignatureImage();
    }

    // Reset signature image to default state
    function resetSignatureImage() {
        const $signatureImage = $('#draggable-signature');
        $signatureImage.hide(); // Hide the image when clearing the canvas

        $signatureImage.css({
            width: `${defaultSignatureDimensions.width}px`,
            height: `${defaultSignatureDimensions.height}px`,
            transform: 'translate(0, 0)' // Reset position
        }).attr('data-x', 0).attr('data-y', 0);
    }

    $(document).ready(function() {
        let timeout;
        const zoomControls = $('.zoom-custom');

        $(window).on('scroll', function() {
            // Show zoom controls on scroll
            zoomControls.stop().fadeIn(200);

            // Clear the previous timeout if scrolling
            clearTimeout(timeout);

            // Hide zoom controls after a delay of inactivity (e.g., 2 seconds)
            timeout = setTimeout(function() {
                zoomControls.stop().fadeOut(200);
            }, 2000); // Adjust the delay as needed
        });

        // Also hide zoom controls when mouse is not moving
        $(document).on('mousemove', function() {
            zoomControls.stop().fadeIn(200);

            // Clear the previous timeout if mouse is moving
            clearTimeout(timeout);

            // Hide zoom controls after a delay of inactivity (e.g., 2 seconds)
            timeout = setTimeout(function() {
                zoomControls.stop().fadeOut(200);
            }, 2000); // Adjust the delay as needed
        });
    });

    $(document).on('click', '.delete-pdf', function() {
        const pdfId = $(this).data('id');
        
        $.ajax({
            url: `/api/document-sign/delete-pdf/${pdfId}`, // Replace with your delete endpoint
            type: 'DELETE',
            success: function(response) {
                Swal.fire({
                    icon: 'success',
                    title: response.success || 'PDF deleted successfully',
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                }).then(() => {
                    $(`button.delete-pdf[data-id="${pdfId}"]`).closest('tr').remove();
                });
            },
            error: function(xhr) {
                // Handle error responses (HTTP 400, 404, etc.)
                let errorMessage = 'There was an error processing your request.';
                let errorTitle = 'Error';
        
                if (xhr.responseJSON) {
                    if (xhr.status === 404) {
                        errorMessage = xhr.responseJSON.error || 'Failed to delete the PDF.';
                    } else {
                        // Handle other HTTP status codes if needed
                        errorMessage = xhr.responseJSON.error || 'An unexpected error occurred.';
                    }
                }
            
                Swal.fire({
                    title: errorTitle,
                    text: errorMessage,
                    icon: 'warning',
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                }).then(() => {
                    console.error('Delete request failed:', xhr);
                });
            }
        });
    });      

    // Initialize the signature pad
   initializeSignaturePad();

    $(document).on('click', '#uploadPdfButton', function () {
            initializeDocSign();
            $('#documentSignModal').modal('show');
    });
});