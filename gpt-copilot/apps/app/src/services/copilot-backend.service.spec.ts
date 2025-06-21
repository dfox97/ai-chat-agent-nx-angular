import { TestBed } from "@angular/core/testing";
import { CopilotBackendService } from "./copilot-backend.service";
import { PLATFORM_ID } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { imock, instance, mock } from "@johanblumenberg/ts-mockito";


describe('CopilotBackendService', () => {
  let service: CopilotBackendService;

  let mockHttpClient: HttpClient;


  let platformId: object;
  beforeEach(() => {

    mockHttpClient = mock(HttpClient);
    platformId = imock(PLATFORM_ID);


    TestBed.configureTestingModule({
      imports: [CopilotBackendService],
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

    platformId = TestBed.inject(PLATFORM_ID);
  });


  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
