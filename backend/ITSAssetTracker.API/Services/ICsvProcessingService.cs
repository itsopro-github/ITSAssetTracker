using ITSAssetTracker.API.Models.DTOs;

namespace ITSAssetTracker.API.Services;

public interface ICsvProcessingService
{
    Task<CsvUploadResultDto> ProcessCsvUpload(Stream csvStream, string uploadedBy);
}
