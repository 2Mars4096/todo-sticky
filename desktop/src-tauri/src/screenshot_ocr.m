#import <Foundation/Foundation.h>
#import <Vision/Vision.h>
#include <string.h>

// Caller owns the returned UTF-8 string. NULL means recognition failed.
char *sticky_recognize_text(const unsigned char *bytes, size_t length) {
    @autoreleasepool {
        NSData *data = [NSData dataWithBytesNoCopy:(void *)bytes length:length freeWhenDone:NO];
        VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithData:data options:@{}];
        VNRecognizeTextRequest *request = [[VNRecognizeTextRequest alloc] init];
        request.recognitionLevel = VNRequestTextRecognitionLevelAccurate;
        if ([request respondsToSelector:@selector(setAutomaticallyDetectsLanguage:)]) {
            request.automaticallyDetectsLanguage = YES;
        }
        if (![handler performRequests:@[request] error:NULL]) return NULL;
        NSMutableArray *lines = [NSMutableArray array];
        for (VNRecognizedTextObservation *observation in request.results) {
            NSString *text = [observation topCandidates:1].firstObject.string;
            if (text.length) [lines addObject:text];
        }
        return strdup([lines componentsJoinedByString:@"\n"].UTF8String);
    }
}
