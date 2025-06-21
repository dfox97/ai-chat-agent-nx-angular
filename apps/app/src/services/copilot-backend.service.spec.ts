import { TestBed } from "@angular/core/testing";
import { CopilotBackendService } from "./copilot-backend.service";
import { PLATFORM_ID } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { instance, mock } from "@johanblumenberg/ts-mockito";


describe('CopilotBackendService', () => {
  let service: CopilotBackendService;

  let mockHttpClient: HttpClient;

  beforeEach(() => {

    mockHttpClient = mock(HttpClient);


    TestBed.configureTestingModule({
      providers: [
        CopilotBackendService,
        {
          provide: PLATFORM_ID,
          useValue: 'browser', // Default to 'browser' for most tests
        },
        {
          provide: HttpClient,
          useValue: instance(mockHttpClient), // Use the mocked HttpClient
        }
      ],
    });

    service = TestBed.inject(CopilotBackendService);
  });


  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
