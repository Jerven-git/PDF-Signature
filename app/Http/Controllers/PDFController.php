<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\PDFService;

class PDFController extends Controller
{
    protected $PDFService;
    /**
     * PDFnController constructor.
     *
     * @param DocumentSignService $PDFService
     */
    public function __construct(PDFService $PDFService)
    {
        $this->PDFService = $PDFService;
    }

    /**
     * Stores uploaded sign documents by delegating the request to the document request service.
     *
     * Calls the `storeReqDocuments` method from the document request service with the provided request and ID.
     * Returns a JSON response with the result of the operation and appropriate HTTP status code.
     *
     * @param \Illuminate\Http\Request $request The HTTP request containing files and other data.
     * @param int $id The ID of the template builder to associate with the uploaded request documents.
     * @return \Illuminate\Http\JsonResponse JSON response with success or error message and HTTP status code.
     */
    public function store(Request $request)
    {
        $result = $this->PDFService->uploadSignDocuments($request);
        if ($result['status'] === 200) {
            return response()->json(['success' => $result['success']], 200);
        } 
        return response()->json(['error' => $result['error']], $result['status']);
    }

    public function list(Request $request)
    {
        $result = $this->PDFService->PdfList();
        
        if ($result['success']) {
            return response()->json(['data' => $result['data']], $result['status']);
        }
        
        return response()->json(['error' => $result['message']], $result['status']);
    }    
    
    public function previewPdf($id)
    {
        $result = $this->PDFService->openPdf($id);
        
        if ($result['status'] === 200) {
            return response()->file($result['pdfPath']);
        }
        return response()->json($result, $result['status']);
    }

    public function saveWithSignature(Request $request)
    {
        // Fetch required data from request
        $pdfId = $request->input('pdfId');
        $signatureData = $request->input('signature');
        $x = $request->input('x');
        $y = $request->input('y');
        $adjustedsignatureWidth = $request->input('width');
        $adjustedsignatureHeight = $request->input('height');
        $canvasWidth = $request->input('canvasWidth');
        $canvasHeight = $request->input('canvasHeight');
        $pageNumber = $request->input('pageNumber'); // Get the page number
    
        // Call the service to save the signature
        $result = $this->PDFService->saveSignature(
            $pdfId,
            $signatureData,
            $x,
            $y,
            $adjustedsignatureWidth,
            $adjustedsignatureHeight,
            $canvasWidth,
            $canvasHeight,
            $pageNumber
        );
    
        // Check result and return appropriate response
        if ($result['status'] === 200) {
            return response()->json(['message' => $result['success']], 200);
        }
    
        return response()->json(['error' => $result['error']], $result['status']);
    }

    /**
     * Deletes a specific document by delegating the request to the document service.
     *
     * Calls the `deleteDocument` method from the document service with the provided template builder ID and file ID.
     * Returns a JSON response with success or error message based on the result of the operation.
     *
     * @param int $templateBuilderId The ID of the template builder associated with the document.
     * @param int $fileId The ID of the document to be deleted.
     * @return \Illuminate\Http\JsonResponse JSON response with success or error message and HTTP status code.
     */
    public function delete($fileId)
    {
        $result = $this->PDFService->deletePdfDocument($fileId);
        if ($result['status'] === 200) {
            return response()->json(['success' => $result['success']], 200);
        } 
        return response()->json(['error' => $result['error']], $result['status']);
    }

    //Commented 
    // public function getCoordinates($pdfId)
    // {
    //     // Fetch the record from the database
    //     $documentSignature = DB::table('document_signatures')->where('id', $pdfId)->first();
    //     if (!$documentSignature) {
    //         return response()->json(['error' => 'Document not found'], 404);
    //     }
    //     // Decode the stored signatures (assuming they are stored as a JSON-encoded string)
    //     $signatures = $documentSignature->signatures ? json_decode($documentSignature->signatures, true) : [];
        
    //     // Return the signatures along with their coordinates
    //     return response()->json([
    //         'signatures' => $signatures
    //     ]);
    // }    
}
