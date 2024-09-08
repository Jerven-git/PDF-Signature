<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PDFController;


/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::prefix('/document-sign')->group(function () {
    Route::post('/pdfs/upload', [PDFController::class, 'store']);
    Route::post('/pdfs/save/{id}', [PDFController::class, 'saveWithSignature']);
    Route::get('/pdfs/list', [PDFController::class, 'list']);
    Route::get('/pdfs/preview/{id}', [PDFController::class, 'previewPdf']);
    Route::get('/get-coordinates/{id}', [PDFController::class, 'getCoordinates']);
    Route::delete('/delete-pdf/{fileId}', [PDFController::class, 'delete']);
});