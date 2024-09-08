@extends('layouts.app')

@section('title', 'Main Page')

@section('content')
    <div class="container my-4">
        <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#documentSignModal">
            Upload PDF
        </button>
    </div>

    <div class="container my-4">
        <div id="pdfListContainer">
         <!-- PDF list will be appended here -->
        </div>
    </div>

    <!-- Modal Document Sign Upload -->
    <div class="modal fade" id="documentSignModal" tabindex="-1" aria-labelledby="documentSignModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <div class="modal-header bg-darkblue">
                    <h5 class="modal-title" id="documentSignModalLabel">Document Sign Upload</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="fileUploadForm" enctype="multipart/form-data">
                        <div class="tab-content" id="uploadTabContent">
                            <div class="tab-pane fade show active" role="tabpanel" aria-labelledby="fileUploadTab">
                                <div>
                                    <input type="file" accept="application/pdf" class="form-control" id="uploadDocSign" name="files[]" multiple>
                                    <div class="file-list" id="fileSign"></div> <!-- Empty container for displaying uploaded files -->
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-outline-blue btn-sm" form="fileUploadForm">Upload Files</button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Modal -->
    <div class="modal fade" id="docSignModal" tabindex="-1" aria-labelledby="docSignModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="docSignModalLabel">Document Signer</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div id="pdf-container">
                        <canvas id="pdf-canvas"></canvas>
                    </div>
                    <div class="zoom-custom">
                        <i id="prev-page" type="button" class="fa fa-angle-left"></i>
                        <i id="zoom-in" class="fa fa-search-plus" aria-hidden="true"></i>
                        <span id="page-info">Page <span id="current-page">1</span> of <span id="total-pages">--</span></span>
                        <i id="zoom-out" class="fa fa-search-minus" aria-hidden="true"></i>
                        <i id="next-page" type="button" class="fa fa-angle-right"></i>
                    </div>
                    <div id="signature-holder">
                        <!-- Signature will be generated and displayed directly here -->
                    </div>
                    <div id="signature-container">
                        <div id="signature-pad-container">
                            <div id="signature-pad" class="jq-signature"></div>
                            <button id="clearBtn" class="btn btn-primary" onclick="clearSign();">Clear Canvas</button>
                            <button id="generateBtn" class="btn btn-primary" onclick="generateSignature();">Generate Signature</button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button id="saveBtn" class="btn btn-primary">Save Signature</button>
                </div>
            </div>
        </div>
    </div>
@endsection

@push('scripts')
    <script>
        // Additional JavaScript specific to the main page
        $(document).ready(function() {
            console.log("Main Page scripts loaded.");
        });
    </script>
@endpush
