import 'package:flutter_test/flutter_test.dart';
import 'package:katha_vistaar/main.dart';

void main() {
  testWidgets('Katha Vistaar root widget builds', (WidgetTester tester) async {
    await tester.pumpWidget(const KathaVistaarApp());
    expect(find.byType(KathaVistaarApp), findsOneWidget);
  });
}
