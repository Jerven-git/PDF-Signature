<?php

namespace App\Services;

use Illuminate\Support\Facades\Validator;
use App\Models\PDF;
use Illuminate\Support\Facades\Storage;
use setasign\Fpdi\Tcpdf\Fpdi;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB;

class PDFService
{
    public function uploadSignDocuments($request)
    {
        $validator = Validator::make($request->all(), [
            'files.*' => 'required|mimes:pdf|max:2048',
        ]);
    
        if ($validator->fails()) {
            return ['error' => $validator->errors(), 'status' => 400];
        }
    
        $files = $request->file('files') ?? [];
        $file_paths = [];
    
        foreach ($files as $file) {
            if (PDF::where('file_name', $file->getClientOriginalName())->exists()) {
                return ['error' => 'File already exists in this template section.', 'status' => 409];
            }
    
            $original_filename = $file->getClientOriginalName();
            $file_name = pathinfo($original_filename, PATHINFO_FILENAME);
            $extension = $file->getClientOriginalExtension();
            $unique_filename = $file_name . '_' . time() . '.' . $extension;
    
            // Store file in the 'public/pdfs' directory under 'storage/app/public/pdfs'
            $path = $file->storeAs('public/pdfs', $unique_filename);
    
            // Replace 'public/' with 'storage/' to get the public URL
            $storagePath = str_replace('public/', 'storage/', $path);
            PDF::create([
                'file_name' => $original_filename,
                'path' => $path,
            ]);
    
            // Add the public URL of the file
            $file_paths[] = asset($storagePath);
        }
    
        if (!empty($file_paths)) {
            return ['success' => 'Documents uploaded successfully.', 'file_paths' => $file_paths, 'status' => 200];
        }
    
        return ['error' => 'No files uploaded.', 'status' => 400];
    }    

    /**
     * Retrieves a list of all PDF documents.
     *
     * @param Request $request The HTTP request object.
     * @return array Response array with list of PDFs and HTTP status code.
     */
    public function PdfList()
    {
        $pdfs = PDF::all(); // Fetch all PDFs

        if ($pdfs->isEmpty()) {
            return ['success' => false, 'message' => 'No PDFs found.', 'status' => 404];
        }

        return ['success' => true, 'data' => $pdfs, 'status' => 200];
    }
    
    public function openPdf($id)
    {
        try {
            $document = PDF::findOrFail($id);
            $pdfPath = storage_path('app/' . $document->path);
    
            // Check if the file exists
            if (!file_exists($pdfPath)) {
                return ['message' => 'File not found.', 'status' => 404];
            }
            return ['pdfPath' => $pdfPath, 'status' => 200];
    
        } catch (\Exception $e) {
            return ['error' => $e->getMessage(), 'status' => 500];
        }
    }

    public function saveSignature(
        $pdfId,
        $signatureData,
        $x,
        $y,
        $adjustedsignatureWidth,
        $adjustedsignatureHeight,
        $canvasWidth,
        $canvasHeight,
        $pageNumber
    )
    {
        // Retrieve the PDF record from the database
        $documentSignature = DB::table('p_d_f_s')->where('id', $pdfId)->first();
        if (!$documentSignature) {
            return ['error' => 'PDF record not found.', 'status' => 404];
        }
    
        $pdfPath = $documentSignature->path;
        if (!$pdfPath || !Storage::exists($pdfPath)) {
            return ['error' => 'PDF file not found.', 'status' => 404];
        }
    
        // Initialize FPDI and load the PDF
        $pdf = new Fpdi();
        $pageCount = $pdf->setSourceFile(Storage::path($pdfPath));
    
        // Prepare the directory for the signature image
        $signatureDir = storage_path('app/public/signatures');
        if (!File::exists($signatureDir)) {
            File::makeDirectory($signatureDir, 0755, true);
        }
    
        // Decode the signature data and save it as an image
        if (strpos($signatureData, 'data:image/png;base64,') === 0) {
            $signatureData = substr($signatureData, strlen('data:image/png;base64,'));
        }
    
        $signatureImage = base64_decode($signatureData);
        if ($signatureImage === false) {
            return ['error' => 'Invalid base64 data.', 'status' => 400];
        }
    
        $signaturePath = $signatureDir . '/' . uniqid() . '_signature.png';
        if (file_put_contents($signaturePath, $signatureImage) === false) {
            return ['error' => 'Failed to save signature image.', 'status' => 500];
        }
    
        $pdf->SetAutoPageBreak(false, 0);
        $pdf->SetPrintHeader(false);
        $pdf->setPrintFooter(false);
        $pdf->SetMargins(0, 0, 0);
    
        // Process each page and place the signature on the specified page
        for ($i = 1; $i <= $pageCount; $i++) {
            $tplIdx = $pdf->importPage($i);
            $pdfSize = $pdf->getTemplateSize($tplIdx);
            $pdfActualWidth = $pdfSize['width'];
            $pdfActualHeight = $pdfSize['height'];
    
            $pdf->AddPage($pdfSize['orientation'], [$pdfActualWidth, $pdfActualHeight]);
            $pdf->useTemplate($tplIdx, 0, 0, $pdfActualWidth, $pdfActualHeight);
    
            // Calculate the scale factor between the PDF size and the canvas size
            $pdfScaleFactorX = $pdfActualWidth / $canvasWidth;
            $pdfScaleFactorY = $pdfActualHeight / $canvasHeight;
            $pdfScaleFactor = min($pdfScaleFactorX, $pdfScaleFactorY);
    
            $adjustedX = $x * $pdfScaleFactor;
            $adjustedY = $y * $pdfScaleFactor;
            $adjustedWidth = $adjustedsignatureWidth * $pdfScaleFactor;
            $adjustedHeight = $adjustedsignatureHeight * $pdfScaleFactor;
    
            if ($i == $pageNumber) {
                // Check if the signature fits within the current page
                if ($adjustedY + $adjustedHeight <= $pdfActualHeight && $adjustedX + $adjustedWidth <= $pdfActualWidth) {
                    $pdf->Image($signaturePath, $adjustedX, $adjustedY, $adjustedWidth, $adjustedHeight);
                } else {
                    return ['error' => 'Signature exceeds page bounds.', 'status' => 400];
                }
            }
        }
    
        // Overwrite the existing PDF with the signed version
        $outputPath = storage_path('app/' . $pdfPath);
        $pdf->Output($outputPath, 'F');
    
        // Update the database with the new signature details
        DB::table('p_d_f_s')->where('id', $pdfId)->update([
            'signatures' => json_encode([
                'path' => $signaturePath,
                'x' => $adjustedX,
                'y' => $adjustedY,
                'width' => $adjustedWidth,
                'height' => $adjustedHeight,
                'page' => $pageNumber,
            ])
        ]);
    
        return ['success' => 'PDF signed successfully', 'status' => 200];
    }

    /**
     * Deletes a specific document.
     *
     * Finds the document by ID, deletes its file from storage, and removes the document record from the database.
     *
     * @param int $fileId The ID of the document to delete.
     * @return array Response array with success or error message and HTTP status code.
     */
    public function deletePdfDocument($fileId)
    {
        $documentPdf = PDF::where('id', $fileId)->first();
        if (!$documentPdf) {
            return ['success' => false, 'error' => 'Document not found.', 'status' => 404];
        }

        // Delete the file from storage
        Storage::delete($documentPdf->path);

        // Delete the document record from the database
        $documentPdf->delete();

        return ['success' => 'PDF Document deleted successfully.', 'status' => 200];
    }
}